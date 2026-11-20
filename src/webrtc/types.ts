export type CallSignal =
  | { t: 'call'; action: 'invite'; video: boolean }
  | { t: 'call'; action: 'accept' | 'decline' | 'end' }
  | { t: 'call'; action: 'state'; mic: boolean; cam: boolean };

// Replacing the shared mailbox secret, over the encrypted direct connection (never through relays):
// rotate (new secret) -> rotate-ack -> rotate-done.
export type RotateSignal = { t: 'rotate' | 'rotate-ack' | 'rotate-done'; secret: string };

// Everything sent over the control channel, as JSON.
export type ControlMessage =
  // `id` is answered with "ack", so the sender knows it arrived (older versions send no id).
  | { t: 'text'; text: string; id?: string }
  | { t: 'ack'; id: string }
  | { t: 'sdp'; description: RTCSessionDescriptionInit }
  | { t: 'ice'; candidate: RTCIceCandidateInit }
  | CallSignal
  | RotateSignal;

// First message of every file channel; binary chunks follow.
export type FileMeta = {
  id: string;
  name: string;
  size: number;
  mime: string;
};

// One direct connection, to a contact (key = contact id) or the manual one (key = MANUAL_KEY).
export type Session = {
  key: string;
  // Identifies the offer/answer pair that set this connection up.
  sid: string;
  // We sent the first offer.
  outgoing: boolean;
  peer: RTCPeerConnection;
  // The control channel: chat text and in-band signaling.
  channel: RTCDataChannel | null;
  // Perfect negotiation: the polite peer yields when both send offers at once.
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  remoteStream: MediaStream | null;
  senders: RTCRtpSender[];
  // We closed it on purpose, so it shouldn't reconnect.
  closing: boolean;
  // The control channel opened at least once.
  opened: boolean;
  // Our offer as sent through relays, so it can be sent again (see receiveOffer).
  sentOffer: string | null;
  // Our offer/answer went out: addresses found from now on are sent separately (see relayCandidate).
  signaled: boolean;
  // Addresses waiting to go out together through relays, and the timer that sends them.
  lateCandidates: RTCIceCandidateInit[];
  lateTimer: number | null;
  // TURN servers the connection was set up with (see watchPaths).
  iceServers: RTCIceServer[];
  // How the open connection travels (null until it opens), and when we last looked for a new path.
  route: 'direct' | 'relay' | null;
  restartedAt: number;
  // We accepted a call: our camera/microphone go into the answer to the caller's next offer (see handleDescription),
  // so only one side ever offers and the two offers can't collide.
  attachOnOffer: boolean;
  // Adds a line to this conversation's connection log (Details), for troubleshooting.
  log: (text: string) => void;
};
