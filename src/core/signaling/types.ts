// What travels through relays. Never chat content: only what is needed to open a direct connection.
// What a relayed signal is (its `t`).
// Saved or sent as numbers: never change a value; add new ones at the end.
export enum SignalType {
  Offer = 0,
  Answer = 1,
  Ice = 2,
  Path = 3,
  InviteAccept = 4,
  InviteReveal = 5,
}

export type SignalMessage =
  | { t: SignalType.Offer; sid: string; sdp: string }
  | { t: SignalType.Answer; sid: string; sdp: string }
  // Addresses found after the offer/answer went out, while there is no direct connection to send them over yet.
  | { t: SignalType.Ice; sid: string; candidates: RTCIceCandidateInit[] }
  // The open connection lost its network path: a new path search (ICE restart) for connection `sid`, sent here
  // because the connection itself can't carry it any more.
  | { t: SignalType.Path; sid: string; type: 'offer' | 'answer'; sdp: string }
  // Sent to an invite's mailbox: "I used your invite; here is the secret for our mailboxes", signed with the
  // joiner's new key for the inviter.
  | { t: SignalType.InviteAccept; secret: string }
  // The inviter's answer, signed with the key that hashes to the invite's commitment.
  | { t: SignalType.InviteReveal };

export type SignedBody = {
  // The sender's and the recipient's public keys for each other. An InviteAccept goes to the invite's commitment
  // instead, because the joiner doesn't know the inviter's key yet.
  from: string;
  to: string;
  // Unix seconds, and a random value, so a recorded signal can't be replayed.
  ts: number;
  nonce: string;
  msg: SignalMessage;
};

export type Envelope = {
  // JSON of a SignedBody, signed as-is.
  body: string;
  sig: string;
};
