import { ProtectionMode } from '../../../core/identity/types.ts';

export const MODE_LABELS: Record<ProtectionMode, string> = {
  [ProtectionMode.Passkey]: 'Passkey',
  [ProtectionMode.Passphrase]: 'Passphrase',
  [ProtectionMode.Device]: 'No protection',
  [ProtectionMode.Temporary]: 'Temporary (nothing saved)',
};
