import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import { utf8 } from '../crypto/utf8.ts';

// Checks that `sig` over `text` was made by the identity `publicKey`.
export const verifyText = async (publicKey: string, text: string, sig: string): Promise<boolean> => {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      b64ToBytes(publicKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );

    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64ToBytes(sig), utf8(text));
  } catch {
    return false;
  }
};
