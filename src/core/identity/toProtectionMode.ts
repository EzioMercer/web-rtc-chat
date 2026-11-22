import { ProtectionMode } from './types.ts';

// Versions before November 2026 saved the mode as a word (in the device's storage and in backup files).
const WORDS: Record<string, ProtectionMode> = {
  passkey: ProtectionMode.Passkey,
  passphrase: ProtectionMode.Passphrase,
  device: ProtectionMode.Device,
  temporary: ProtectionMode.Temporary,
};

// A saved protection mode, old or new form; null when it is neither.
export const toProtectionMode = (value: unknown): ProtectionMode | null => {
  if (typeof value === 'string') {
    return WORDS[value] ?? null;
  }

  return Object.values(ProtectionMode).includes(value as ProtectionMode) ? value as ProtectionMode : null;
};
