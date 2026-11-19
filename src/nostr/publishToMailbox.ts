import { encrypt, getConversationKey } from 'nostr-tools/nip44';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import { RELAYS, SIGNAL_KIND } from './config.ts';
import { pool } from './pool.ts';

// Sends `plaintext` to a mailbox, encrypted (NIP-44) from a throwaway key that is used once and forgotten.
// Resolves with how many relays accepted it (at least one), once at least one did and the others answered or failed.
export const publishToMailbox = async (mailbox: string, plaintext: string): Promise<number> => {
  const throwaway = generateSecretKey();
  const content = encrypt(plaintext, getConversationKey(throwaway, mailbox));
  const event = finalizeEvent({
    kind: SIGNAL_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', mailbox]],
    content,
  }, throwaway);

  throwaway.fill(0);

  const results = await Promise.allSettled(pool.publish(RELAYS, event));
  const accepted = results.filter(result => result.status === 'fulfilled').length;

  if (!accepted) {
    throw new Error('No relay is reachable. Check your internet connection.');
  }

  return accepted;
};
