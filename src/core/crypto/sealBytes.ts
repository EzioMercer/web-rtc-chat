import { randomBytes } from './randomBytes.ts';

// Encrypts bytes with AES-GCM into one buffer: the 12-byte IV, then the ciphertext. `context` is bound to it
// (authenticated, not stored): opening it with any other context fails, so pieces can't be swapped or reordered.
export const sealBytes = async (
  key: CryptoKey,
  plain: BufferSource,
  context?: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> => {
  const iv = randomBytes(12);
  const params: AesGcmParams = context ? { name: 'AES-GCM', iv, additionalData: context } : { name: 'AES-GCM', iv };
  const data = new Uint8Array(await crypto.subtle.encrypt(params, key, plain));
  const out = new Uint8Array(iv.length + data.length);

  out.set(iv);
  out.set(data, iv.length);

  return out;
};
