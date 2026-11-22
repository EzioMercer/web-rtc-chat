import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { utf8 } from '../crypto/utf8.ts';

// Signs `text` with one of our keys.
export const signText = async (signingKey: CryptoKey, text: string): Promise<string> => bytesToB64(
  new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, utf8(text))),
);
