import { sealJson } from '../crypto/sealJson.ts';
import type { SettingsState } from '../../store/settings/types.ts';
import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { vault } from './vault.ts';
import { ProtectionMode } from './types.ts';

// Encrypts and saves this device's settings, like the contacts. Temporary identities save nothing.
export const saveSettings = async (settings: SettingsState) => {
  if (!vault.vaultKey || vault.mode === null || vault.mode === ProtectionMode.Temporary) {
    return;
  }

  await kv.set(STORAGE_KEYS.settings, await sealJson(vault.vaultKey, settings));
};
