export type MailboxKeys = {
  // Nostr secret key of the mailbox; only the people who share the mailbox secret can compute it.
  sk: Uint8Array;
  // Its public key: the address senders tag their events with.
  pk: string;
};
