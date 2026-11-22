// Our open invites, by the public key of their mailbox. Memory only: an invite dies with the tab.
export const activeInvites = new Map<string, {
  sk: Uint8Array;
  expiresAt: number;
  // What the link shows instead of our key, and the nonce that goes with it (see inviteCommitment).
  commitment: string;
  nonce: string;
  // Where the joiner waits for us to reveal our key.
  revealMailbox: string;
}>();
