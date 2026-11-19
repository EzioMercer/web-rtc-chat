import { hkdf } from '../../crypto/hkdf.ts';
import { importAesKey } from '../../crypto/importAesKey.ts';

// The passkey's PRF output -> the AES key that encrypts the identity and contacts.
export const prfToKey = async (prf: BufferSource): Promise<CryptoKey> => {
  const bytes = prf instanceof ArrayBuffer
    ? new Uint8Array(prf)
    : new Uint8Array(prf.buffer as ArrayBuffer, prf.byteOffset, prf.byteLength);

  return importAesKey(await hkdf(new Uint8Array(bytes), 'vault-key'));
};
