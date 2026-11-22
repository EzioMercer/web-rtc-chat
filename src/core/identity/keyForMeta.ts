import { getDeviceKey } from './getDeviceKey.ts';
import { getPasskeyKey } from './passkey/getPasskeyKey.ts';
import { derivePassphraseKey } from './passphrase/derivePassphraseKey.ts';
import { type StoredMeta, ProtectionMode } from './types.ts';

// Gets back the key that encrypts the saved identity: asks for the passkey or uses the passphrase.
export const keyForMeta = async (meta: StoredMeta, passphrase?: string): Promise<CryptoKey> => {
  switch (meta.mode) {
    case ProtectionMode.Passkey:
      if (!meta.credentialId || !meta.prfSalt) {
        throw new Error('The saved identity is damaged.');
      }

      return getPasskeyKey(meta.credentialId, meta.prfSalt);
    case ProtectionMode.Passphrase:
      if (!meta.argonSalt || passphrase === undefined) {
        throw new Error('Enter your passphrase.');
      }

      return derivePassphraseKey(passphrase, meta.argonSalt);
    case ProtectionMode.Device:
      return getDeviceKey(false);
  }
};
