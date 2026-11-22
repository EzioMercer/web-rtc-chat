// What an invite link or QR code carries.
export type InvitePayload = {
  v: 2;
  // The inviter's key, hidden until the joiner has answered (see inviteCommitment).
  c: string;
  // One-time invite secret: the reply goes to a mailbox derived from it.
  s: string;
  // Expiry, unix seconds.
  e: number;
};
