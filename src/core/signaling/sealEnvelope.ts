import { zipText } from '../compression/zipText.ts';
import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import { signText } from '../identity/signText.ts';
import type { ContactKey } from '../identity/types.ts';
import type { Envelope, SignalMessage, SignedBody } from './types.ts';

// Wraps a signal for `to`, signed with our key for that contact, and zipped: fewer bytes through the relays. Zipping
// comes here because the note is encrypted afterwards, and encrypted data can't be zipped.
export const sealEnvelope = async (from: ContactKey, to: string, msg: SignalMessage): Promise<string> => {
  const body: SignedBody = {
    from: from.publicKey,
    to,
    ts: Math.floor(Date.now() / 1000),
    nonce: bytesToB64(randomBytes(16)),
    msg,
  };
  const text = JSON.stringify(body);
  const envelope: Envelope = { body: text, sig: await signText(from.signingKey, text) };

  return zipText(JSON.stringify(envelope));
};
