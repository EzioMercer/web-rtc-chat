import { unlockIdentity } from '../../../core/identity/unlockIdentity.ts';
import { loadProfile } from '../../../core/identity/loadProfile.ts';
import { loadSettings } from '../../../core/identity/loadSettings.ts';
import { vault } from '../../../core/identity/vault.ts';
import { busyStarted, failed, unlocked } from '../../app/appSlice.ts';
import { contactsLoaded } from '../../contacts/contactsSlice.ts';
import { profileLoaded } from '../../profile/profileSlice.ts';
import { settingsLoaded } from '../../settings/settingsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { afterUnlock } from './afterUnlock.ts';
import { errorMessage } from './errorMessage.ts';
import { loadSavedChats } from './loadSavedChats.ts';
import { ProtectionMode } from '../../../core/identity/types.ts';

export const unlockApp = (passphrase?: string): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(busyStarted());

  try {
    dispatch(contactsLoaded(await unlockIdentity(passphrase)));
    dispatch(settingsLoaded(await loadSettings()));
    dispatch(profileLoaded(await loadProfile()));
    await dispatch(loadSavedChats());
  } catch (err) {
    dispatch(failed(errorMessage(err)));

    return;
  }

  dispatch(unlocked(vault.mode ?? ProtectionMode.Device));
  dispatch(afterUnlock());
};
