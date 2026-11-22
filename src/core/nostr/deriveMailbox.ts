import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import { hkdf } from '../crypto/hkdf.ts';
import { keysFromSeed } from './keysFromSeed.ts';
import type { MailboxKeys } from './types.ts';
import { utcDay } from './utcDay.ts';

const cache = new Map<string, MailboxKeys>();

// The mailbox where `recipient` receives signals from a contact, on `day`. It changes every day and is different
// for each direction, so relays can't link one day's traffic to the next.
export const deriveMailbox = async (secret: string, recipient: string, day = utcDay()): Promise<MailboxKeys> => {
  const id = `${secret}|${recipient}|${day}`;
  const cached = cache.get(id);

  if (cached) {
    return cached;
  }

  const keys = keysFromSeed(await hkdf(b64ToBytes(secret), `mailbox|${recipient}|${day}`));

  cache.set(id, keys);

  return keys;
};
