// Decrypts what `sealBytes` produced, with the same `context`. Throws if the key or context is wrong, or the data
// was changed.
export const unsealBytes = async (
  key: CryptoKey,
  sealed: Uint8Array<ArrayBuffer>,
  context?: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> => {
  const iv = sealed.subarray(0, 12);
  const data = sealed.subarray(12);
  const params: AesGcmParams = context ? { name: 'AES-GCM', iv, additionalData: context } : { name: 'AES-GCM', iv };

  return new Uint8Array(await crypto.subtle.decrypt(params, key, data));
};
