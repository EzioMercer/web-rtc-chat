import type { Sealed } from '../crypto/types.ts';
import { unsealJson } from '../crypto/unsealJson.ts';
import { DEFAULT_SETTINGS } from '../../store/settings/settingsSlice.ts';
import { EchoGuardSetting, type SettingsState } from '../../store/settings/types.ts';
import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { vault } from './vault.ts';

const toEchoGuard = (value: unknown): EchoGuardSetting => (
  Object.values(EchoGuardSetting).includes(value as EchoGuardSetting)
    ? value as EchoGuardSetting
    : DEFAULT_SETTINGS.echoGuard
);

// This device's saved settings, once the identity is unlocked. Anything missing, unreadable or unknown (e.g. after
// restoring a backup, which was made with another key) falls back to the default.
export const loadSettings = async (): Promise<SettingsState> => {
  const sealed = await kv.get<Sealed>(STORAGE_KEYS.settings);

  if (!sealed || !vault.vaultKey) {
    return DEFAULT_SETTINGS;
  }

  try {
    const saved = await unsealJson<Partial<SettingsState>>(vault.vaultKey, sealed);

    return {
      echoGuard: toEchoGuard(saved.echoGuard),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};
