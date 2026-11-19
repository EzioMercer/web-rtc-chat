// What travels through relays. Never chat content: only what is needed to open a direct connection.
export type SignalMessage =
  | { t: 'offer'; sid: string; sdp: string }
  | { t: 'answer'; sid: string; sdp: string }
  // Addresses found after the offer/answer went out, while there is no direct connection to send them over yet.
  | { t: 'ice'; sid: string; candidates: RTCIceCandidateInit[] }
  // Sent to an invite's mailbox: "I used your invite; here is the secret for our mailboxes".
  | { t: 'invite-accept'; secret: string };

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
