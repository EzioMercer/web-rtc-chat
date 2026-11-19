import { deriveMailbox } from '../nostr/deriveMailbox.ts';
import { publishToMailbox } from '../nostr/publishToMailbox.ts';
import type { Contact } from '../store/contacts/types.ts';
import { sealEnvelope } from './sealEnvelope.ts';
import type { SignalMessage } from './types.ts';

// Sends a signed, encrypted signal to the contact's mailbox for today. Returns how many relays took it.
export const sendSignal = async (contact: Contact, msg: SignalMessage): Promise<number> => {
  const mailbox = await deriveMailbox(contact.sendSecret, contact.identity);

  return publishToMailbox(mailbox.pk, await sealEnvelope(contact.identity, msg));
};
