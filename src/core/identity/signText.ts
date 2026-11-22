import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { utf8 } from '../crypto/utf8.ts';
import { vault } from './vault.ts';

// Signs `text` with our identity key.
export const signText = async (text: string): Promise<string> => {
  if (!vault.signingKey) {
    throw new Error('Identity is locked');
  }

  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vault.signingKey, utf8(text));

  return bytesToB64(new Uint8Array(sig));
};
