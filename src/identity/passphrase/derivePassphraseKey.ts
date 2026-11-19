import { b64ToBytes } from '../../crypto/b64ToBytes.ts';
import { importAesKey } from '../../crypto/importAesKey.ts';

// Argon2id is deliberately slow and memory-hungry, so guessing passphrases offline is expensive.
export const derivePassphraseKey = async (passphrase: string, salt: string): Promise<CryptoKey> => {
  // Loaded only when a passphrase is used.
  const { argon2id } = await import('hash-wasm');
  const raw = await argon2id({
    password: passphrase.normalize('NFKC'),
    salt: b64ToBytes(salt),
    parallelism: 1,
    iterations: 3,
    memorySize: 64 * 1024,
    hashLength: 32,
    outputType: 'binary',
  });

  return importAesKey(new Uint8Array(raw));
};
