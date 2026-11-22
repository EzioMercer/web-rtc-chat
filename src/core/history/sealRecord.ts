import { sealBytes } from '../crypto/sealBytes.ts';
import { utf8 } from '../crypto/utf8.ts';
import { vault } from '../identity/vault.ts';

// Encrypts something to be saved under `key` with the data key. The key is bound to it, so saved pieces can't be
// swapped around.
export const sealRecord = (key: string, plain: BufferSource): Promise<Uint8Array<ArrayBuffer>> => {
  if (!vault.vaultKey) {
    throw new Error('Identity is locked');
  }

  return sealBytes(vault.vaultKey, plain, utf8(key));
};
