// Bytes -> base64url without padding.
export const bytesToB64 = (bytes: Uint8Array): string => {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
