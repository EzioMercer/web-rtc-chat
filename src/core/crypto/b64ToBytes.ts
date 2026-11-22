// base64url (or plain base64) -> bytes. Throws on invalid input.
export const b64ToBytes = (b64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};
