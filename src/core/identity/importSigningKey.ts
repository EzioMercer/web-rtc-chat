// Turns the decrypted private key into a non-extractable signing key.
export const importSigningKey = (pkcs8: Uint8Array<ArrayBuffer>): Promise<CryptoKey> => crypto.subtle.importKey(
  'pkcs8',
  pkcs8,
  { name: 'ECDSA', namedCurve: 'P-256' },
  false,
  ['sign'],
);
