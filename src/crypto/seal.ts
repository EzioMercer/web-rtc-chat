import { bytesToB64 } from './bytesToB64.ts';
import { randomBytes } from './randomBytes.ts';
import type { Sealed } from './types.ts';

// Encrypts bytes with AES-GCM.
export const seal = async (key: CryptoKey, plain: Uint8Array<ArrayBuffer>): Promise<Sealed> => {
  const iv = randomBytes(12);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));

  return { iv: bytesToB64(iv), data: bytesToB64(data) };
};
