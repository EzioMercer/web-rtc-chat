// Our open invites, by the public key of their mailbox. Memory only: an invite dies with the tab.
export const activeInvites = new Map<string, {
  sk: Uint8Array;
  expiresAt: number;
  // Where our new key for whoever uses it is kept (contactKeys), and the id their contact will get.
  id: string;
  // What the link shows instead of that key (see inviteCommitment).
  commitment: string;
  // Where the joiner waits for us to reveal our key.
  revealMailbox: string;
}>();
