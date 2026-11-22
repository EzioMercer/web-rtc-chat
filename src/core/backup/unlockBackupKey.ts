import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import { importAesKey } from '../crypto/importAesKey.ts';
import { unsealBytes } from '../crypto/unsealBytes.ts';
import { derivePassphraseKey } from '../identity/passphrase/derivePassphraseKey.ts';
import type { BackupHeader } from './types.ts';

// The backup's key, opened with its password.
export const unlockBackupKey = async (header: BackupHeader, password: string): Promise<CryptoKey> => {
  const passwordKey = await derivePassphraseKey(password, header.salt);
  let raw: Uint8Array<ArrayBuffer>;

  try {
    raw = await unsealBytes(passwordKey, b64ToBytes(header.key));
  } catch {
    throw new Error('Wrong password.');
  }

  const key = await importAesKey(raw);

  raw.fill(0);

  return key;
};
