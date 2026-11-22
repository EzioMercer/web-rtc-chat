import { hkdf } from '../../crypto/hkdf.ts';
import { importAesKey } from '../../crypto/importAesKey.ts';

// The passkey's PRF output -> the AES key that protects the data key (see StoredMeta).
export const prfToKey = async (prf: BufferSource): Promise<CryptoKey> => {
  const bytes = prf instanceof ArrayBuffer
    ? new Uint8Array(prf)
    : new Uint8Array(prf.buffer as ArrayBuffer, prf.byteOffset, prf.byteLength);

  return importAesKey(await hkdf(new Uint8Array(bytes), 'vault-key'));
};
