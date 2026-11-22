import type { MediaNote } from '../../store/chat/types.ts';
import type { SessionRoute } from '../../store/sessions/types.ts';
import type { TrackKind } from './TrackKind.ts';

// What a control channel message is (its `t`).
export enum ControlType {
  Text,
  Ack,
  Sdp,
  Ice,
  Call,
  Rotate,
  RotateAck,
  RotateDone,
  // Moving a call to a new, direct connection (see store/thunks/move).
  Move,
}

export enum CallAction {
  Invite,
  Accept,
  Decline,
  End,
  State,
  // They hear an echo of their own voice from our side (see useEchoDetector).
  Echo,
}

export type CallSignal =
  | { t: ControlType.Call; action: CallAction.Invite; video: boolean }
  | { t: ControlType.Call; action: CallAction.Accept | CallAction.Decline | CallAction.End | CallAction.Echo }
  // `screen`: they share their screen.
  | { t: ControlType.Call; action: CallAction.State; mic: boolean; cam: boolean; screen?: boolean };

// Steps of moving a call from the TURN relay to a new, direct connection, which is tested before the call goes over
// and kept until it holds (see store/thunks/move). The impolite side leads.
export enum MoveStep {
  // Leader: let's try a direct connection.
  Ask,
  // Other side: yes; `kinds` says what our call sends (each a slot on the new connection).
  Ready,
  // Leader: the new connection's offer, with what our call sends.
  Offer,
  Answer,
  // Over the new connection while it is tested: every ping must be answered in time.
  Ping,
  Pong,
  // Leader: our call goes out on the new connection now; move over.
  Switch,
  // Other side: moved over.
  Done,
  // The new connection broke soon after the move: back to the old one.
  Back,
  // Give the attempt up (no direct path, or the call changed meanwhile).
  Abort,
}

export type MoveSignal = { t: ControlType.Move; step: MoveStep; id: string; sdp?: string; kinds?: TrackKind[] };

// Replacing the shared mailbox secret, over the encrypted direct connection (never through relays):
// rotate (new secret) -> rotate-ack -> rotate-done.
export type RotateSignal = {
  t: ControlType.Rotate | ControlType.RotateAck | ControlType.RotateDone;
  secret: string;
};

// Everything sent over the control channel, as JSON.
export type ControlMessage =
  // `id` is answered with "ack", so the sender knows it arrived (older versions send no id).
  // `waited`: how long (ms) it waited on the sender's side before this send (it was written while offline), so
  // the receiver can put it in place without relying on the two devices' clocks agreeing.
  | { t: ControlType.Text; text: string; id?: string; waited?: number }
  | { t: ControlType.Ack; id: string }
  | { t: ControlType.Sdp; description: RTCSessionDescriptionInit }
  | { t: ControlType.Ice; candidate: RTCIceCandidateInit }
  | CallSignal
  | RotateSignal
  | MoveSignal;

// First message of every file channel; binary chunks follow.
export type FileMeta = {
  id: string;
  name: string;
  size: number;
  mime: string;
  // Voice and video messages (older versions show them as plain files).
  note?: MediaNote;
  // Sent zipped: this many bytes come, which unzip into `size` (see packFile).
  packed?: number;
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
  // In an audio call: the video sender added for sharing our screen, reused if we share again.
  screenSender: RTCRtpSender | null;
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
  route: SessionRoute | null;
  restartedAt: number;
  // We accepted a call: our camera/microphone go into the answer to the caller's next offer (see handleDescription),
  // so only one side ever offers and the two offers can't collide.
  attachOnOffer: boolean;
  // The path broke and we are looking for a new one (through the relays), since this time; null otherwise.
  rescueSince: number | null;
  // Moving the call to a new, direct connection (see store/thunks/move); null when not moving.
  move: Move | null;
  // Adds a line to this conversation's connection log (Details), for troubleshooting.
  log: (text: string) => void;
};

// The parts of a session that belong to one RTCPeerConnection, swapped as a whole when a call moves.
export type Link = Pick<Session, 'peer' | 'channel' | 'senders' | 'screenSender' | 'remoteStream' | 'iceServers'>;

export enum MovePhase {
  Asking,
  Connecting,
  Testing,
  // The leader sends the call on both connections and waits for the other side to move over.
  Switching,
  // Moved: the old connection is kept for a while, idle, to go back to if the new one breaks.
  Holding,
}

export type Move = {
  id: string;
  phase: MovePhase;
  // The other connection: the new one until the call moves to it, then the old one.
  other: Link;
  // Our call's senders in pairs: [on the current connection, its place on the other one].
  pairs: [RTCRtpSender, RTCRtpSender][];
  // Their call's slots on the new connection, until the call moves.
  theirs: RTCRtpTransceiver[];
  // When the last ping was answered (leader, while testing).
  lastPong: number;
  timers: number[];
};
