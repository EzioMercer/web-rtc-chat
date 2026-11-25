import type { Sealed } from '../crypto/types.ts';
import { unsealJson } from '../crypto/unsealJson.ts';
import { isAbout } from '../profile/isAbout.ts';
import { isBirthday } from '../profile/isBirthday.ts';
import { isPhone } from '../profile/isPhone.ts';
import { isPicture } from '../profile/isPicture.ts';
import { EMPTY_PROFILE } from '../../store/profile/profileSlice.ts';
import type { ProfileState } from '../../store/profile/types.ts';
import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { vault } from './vault.ts';

// What our contacts see of us, once the identity is unlocked. Anything missing or unreadable means none.
export const loadProfile = async (): Promise<ProfileState> => {
  const sealed = await kv.get<Sealed>(STORAGE_KEYS.profile);

  if (!sealed || !vault.vaultKey) {
    return EMPTY_PROFILE;
  }

  try {
    const saved = await unsealJson<Partial<ProfileState>>(vault.vaultKey, sealed);

    return {
      picture: isPicture(saved.picture) ? saved.picture : null,
      phone: isPhone(saved.phone) ? saved.phone : '',
      about: isAbout(saved.about) ? saved.about : '',
      birthday: isBirthday(saved.birthday) ? saved.birthday : '',
    };
  } catch {
    return EMPTY_PROFILE;
  }
};
