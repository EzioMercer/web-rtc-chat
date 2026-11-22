// What travels through relays. Never chat content: only what is needed to open a direct connection.
// What a relayed signal is (its `t`).
export enum SignalType {
  Offer,
  Answer,
  Ice,
  Path,
  InviteAccept,
}

export type SignalMessage =
  | { t: SignalType.Offer; sid: string; sdp: string }
  | { t: SignalType.Answer; sid: string; sdp: string }
  // Addresses found after the offer/answer went out, while there is no direct connection to send them over yet.
  | { t: SignalType.Ice; sid: string; candidates: RTCIceCandidateInit[] }
  // The open connection lost its network path: a new path search (ICE restart) for connection `sid`, sent here
  // because the connection itself can't carry it any more.
  | { t: SignalType.Path; sid: string; type: 'offer' | 'answer'; sdp: string }
  // Sent to an invite's mailbox: "I used your invite; here is the secret for our mailboxes".
  | { t: SignalType.InviteAccept; secret: string };

export type SignedBody = {
  // Public identity keys of the sender and the recipient.
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
