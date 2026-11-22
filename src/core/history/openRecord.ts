import { unsealBytes } from '../crypto/unsealBytes.ts';
import { utf8 } from '../crypto/utf8.ts';
import { vault } from '../identity/vault.ts';

// Decrypts what sealRecord saved under `key`.
export const openRecord = (key: string, sealed: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> => {
  if (!vault.vaultKey) {
    throw new Error('Identity is locked');
  }

  return unsealBytes(vault.vaultKey, sealed, utf8(key));
};
