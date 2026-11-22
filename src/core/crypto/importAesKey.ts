// A non-extractable AES-GCM key from 32 raw bytes.
export const importAesKey = (raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> => crypto.subtle.importKey(
  'raw',
  raw,
  'AES-GCM',
  false,
  ['encrypt', 'decrypt'],
);
