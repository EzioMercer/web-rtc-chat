import type { ProtectionMode } from '../../../core/identity/types.ts';

export const OPTIONS: { mode: ProtectionMode; title: string; text: string }[] = [
  {
    mode: 'passkey',
    title: 'Passkey (recommended)',
    text: 'Unlock with your fingerprint, face or device PIN. Your identity and contacts are encrypted with a key '
      + 'that only the passkey can produce, so copying this device\'s files gives nothing useful.',
  },
  {
    mode: 'passphrase',
    title: 'Passphrase',
    text: 'Type a passphrase to unlock. It is turned into the encryption key with a deliberately slow algorithm '
      + '(Argon2id). A strong passphrase is safe; a short one can be guessed.',
  },
  {
    mode: 'device',
    title: 'No protection',
    text: 'No unlock step. Anyone with access to this device\'s files could send messages as you.',
  },
  {
    mode: 'temporary',
    title: 'Temporary',
    text: 'Nothing is saved. Your identity and contacts disappear when you close the tab. '
      + 'For shared or untrusted computers.',
  },
];
