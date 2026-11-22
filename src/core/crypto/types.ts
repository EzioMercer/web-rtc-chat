// AES-GCM ciphertext with its IV, both base64url.
export type Sealed = {
  iv: string;
  data: string;
};
