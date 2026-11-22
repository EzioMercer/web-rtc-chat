import { zipText } from '../compression/zipText.ts';
import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import { signText } from '../identity/signText.ts';
import { vault } from '../identity/vault.ts';
import type { Envelope, SignalMessage, SignedBody } from './types.ts';

// Wraps a signal for `to`, signed with our identity key, and zipped: fewer bytes through the relays. Zipping comes
// here because the note is encrypted afterwards, and encrypted data can't be zipped.
export const sealEnvelope = async (to: string, msg: SignalMessage): Promise<string> => {
  const body: SignedBody = {
    from: vault.publicKey,
    to,
    ts: Math.floor(Date.now() / 1000),
    nonce: bytesToB64(randomBytes(16)),
    msg,
  };
  const text = JSON.stringify(body);
  const envelope: Envelope = { body: text, sig: await signText(text) };

  return zipText(JSON.stringify(envelope));
};
