import type { ProtectionMode } from '../../../core/identity/types.ts';

export const MODE_LABELS: Record<ProtectionMode, string> = {
  passkey: 'Passkey',
  passphrase: 'Passphrase',
  device: 'No protection',
  temporary: 'Temporary (nothing saved)',
};
