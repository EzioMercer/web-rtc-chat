// What an invite link or QR code carries.
export type InvitePayload = {
  v: 1;
  // The inviter's public identity key.
  k: string;
  // One-time invite secret: the reply goes to a mailbox derived from it.
  s: string;
  // Expiry, unix seconds.
  e: number;
};
