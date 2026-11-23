import { sealJson } from '../crypto/sealJson.ts';
import type { ProfileState } from '../../store/profile/types.ts';
import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { vault } from './vault.ts';
import { ProtectionMode } from './types.ts';

// Encrypts and saves what our contacts see of us, like the contacts. Temporary identities save nothing.
export const saveProfile = async (profile: ProfileState) => {
  if (!vault.vaultKey || vault.mode === null || vault.mode === ProtectionMode.Temporary) {
    return;
  }

  await kv.set(STORAGE_KEYS.profile, await sealJson(vault.vaultKey, profile));
};
