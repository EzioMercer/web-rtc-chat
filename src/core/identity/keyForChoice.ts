import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import { getDeviceKey } from './getDeviceKey.ts';
import { createPasskeyKey } from './passkey/createPasskeyKey.ts';
import { derivePassphraseKey } from './passphrase/derivePassphraseKey.ts';
import { type ProtectionChoice, type StoredMeta, ProtectionMode } from './types.ts';

type KeyAndMeta = {
  key: CryptoKey;
  meta: Pick<StoredMeta, 'credentialId' | 'prfSalt' | 'argonSalt'>;
};

// Makes the key that will protect the data key (see StoredMeta), for the protection the user chose.
export const keyForChoice = async (choice: ProtectionChoice): Promise<KeyAndMeta> => {
  switch (choice.mode) {
    case ProtectionMode.Passkey: {
      const { key, credentialId, prfSalt } = await createPasskeyKey();

      return { key, meta: { credentialId, prfSalt } };
    }

    case ProtectionMode.Passphrase: {
      const argonSalt = bytesToB64(randomBytes(16));

      return { key: await derivePassphraseKey(choice.passphrase, argonSalt), meta: { argonSalt } };
    }

    case ProtectionMode.Device:
      return { key: await getDeviceKey(true), meta: {} };

    case ProtectionMode.Temporary: {
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

      return { key, meta: {} };
    }
  }
};
