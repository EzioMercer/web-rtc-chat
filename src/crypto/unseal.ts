import { b64ToBytes } from './b64ToBytes.ts';
import type { Sealed } from './types.ts';

// Decrypts what `seal` produced. Throws if the key is wrong or the data was changed.
export const unseal = async (key: CryptoKey, { iv, data }: Sealed): Promise<Uint8Array<ArrayBuffer>> => new Uint8Array(
  await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(iv) }, key, b64ToBytes(data)),
);
