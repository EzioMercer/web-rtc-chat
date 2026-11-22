// Invites we used and are waiting on, by the public key of the mailbox where the inviter reveals their key. Memory
// only, for a few seconds.
export const pendingJoins = new Map<string, {
  sk: Uint8Array;
  // From the invite link: the revealed key and nonce must hash to it.
  commitment: string;
  done: (identity: string, nonce: string) => void;
}>();
