import type { MediaNote } from '../../store/chat/types.ts';
import type { ProfileInfo } from '../profile/types.ts';
import type { SessionRoute } from '../../store/sessions/types.ts';
import type { TrackKind } from './TrackKind.ts';

// What a control channel message is (its `t`).
// Saved or sent as numbers: never change a value; add new ones at the end.
export enum ControlType {
  Text = 0,
  Ack = 1,
  Sdp = 2,
  Ice = 3,
  Call = 4,
  Rotate = 5,
  RotateAck = 6,
  RotateDone = 7,
  // Moving a call to a new, direct connection (see store/thunks/move).
  Move = 8,
  // Whether our end of the path is the TURN relay (see checkRoute).
  Route = 9,
  // Our profile's hashes, or its parts themselves; and asking for them (see store/thunks/profile).
  Profile = 10,
  ProfileAsk = 11,
  // A shared place, or a live location's latest state (see store/thunks/location).
  Location = 12,
}

// Saved or sent as numbers: never change a value; add new ones at the end.
export enum CallAction {
  Invite = 0,
  Accept = 1,
  Decline = 2,
  End = 3,
  State = 4,
  // They hear an echo of their own voice from our side (see useEchoDetector).
  Echo = 5,
}

export type CallSignal =
  | { t: ControlType.Call; action: CallAction.Invite; video: boolean }
  | { t: ControlType.Call; action: CallAction.Accept | CallAction.Decline | CallAction.End | CallAction.Echo }
  // `screen`: they share their screen.
  | { t: ControlType.Call; action: CallAction.State; mic: boolean; cam: boolean; screen?: boolean };

// Steps of moving a call from the TURN relay to a new, direct connection, which is tested before the call goes over
// and kept until it holds (see store/thunks/move). The impolite side leads.
// Saved or sent as numbers: never change a value; add new ones at the end.
export enum MoveStep {
  // Leader: let's try a direct connection.
  Ask = 0,
  // Other side: yes; `kinds` says what our call sends (each a slot on the new connection).
  Ready = 1,
  // Leader: the new connection's offer, with what our call sends.
  Offer = 2,
  Answer = 3,
  // Over the new connection while it is tested: every ping must be answered in time.
  Ping = 4,
  Pong = 5,
  // Leader: our call goes out on the new connection now; move over.
  Switch = 6,
  // Other side: moved over.
  Done = 7,
  // The new connection broke soon after the move: back to the old one.
  Back = 8,
  // Give the attempt up (no direct path, or the call changed meanwhile).
  Abort = 9,
}

export type MoveSignal = { t: ControlType.Move; step: MoveStep; id: string; sdp?: string; kinds?: TrackKind[] };

// Replacing the shared mailbox secret, over the encrypted direct connection (never through relays):
// rotate (new secret) -> rotate-ack -> rotate-done.
export type RotateSignal = {
  t: ControlType.Rotate | ControlType.RotateAck | ControlType.RotateDone;
  secret: string;
};

// When the connection opens or our profile changes, we send the hashes of its two parts ('' for none): the picture,
// and the phone and description together. For each part that differs from what they have, they ask by its hash, and
// we send that part with the hashes again.
export type ProfileSignal =
  | { t: ControlType.Profile; pictureHash: string; infoHash: string; picture?: string; info?: ProfileInfo }
  | { t: ControlType.ProfileAsk; pictureHash?: string; infoHash?: string };

// A shared place, answered with "ack" (with its `rev`). A live location is sent again, with the same id, each time
// it moves or changes, and now and then while it stays put; `live` is how long it still runs (ms; 0 once it
// stopped), so the two devices' clocks needn't agree. Missing for a one-time location.
export type LocationSignal = {
  t: ControlType.Location;
  id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  live?: number;
  rev: number;
  // Like a text's: how long it waited on the sender's side before its first send.
  waited?: number;
};

// Everything sent over the control channel, as JSON.
export type ControlMessage =
  // `id` is answered with "ack", so the sender knows it arrived.
  // `waited`: how long (ms) it waited on the sender's side before this send (it was written while offline), so
  // the receiver can put it in place without relying on the two devices' clocks agreeing.
  | { t: ControlType.Text; text: string; id: string; waited?: number }
  // `rev`: which change of a live location arrived (see LocationSignal).
  | { t: ControlType.Ack; id: string; rev?: number }
  | { t: ControlType.Sdp; description: RTCSessionDescriptionInit }
  | { t: ControlType.Ice; candidate: RTCIceCandidateInit }
  | CallSignal
  | RotateSignal
  | MoveSignal
  | ProfileSignal
  | LocationSignal
  | { t: ControlType.Route; relay: boolean };

// First message of every file channel; binary chunks follow.
export type FileMeta = {
  id: string;
  name: string;
  size: number;
  mime: string;
  // Voice and video messages.
  note?: MediaNote;
  // Sent zipped: this many bytes come, which unzip into `size` (see packFile).
  packed?: number;
  // How long it waited on their side since it was written (ms): sent again after the connection broke.
  waited?: number;
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
  // Whether our end of the path is the TURN relay, as we last told them (null: not told yet), and theirs, as they
  // told us. Their relay address can look like an ordinary one to us, so only they know for sure (see checkRoute).
  ourRelay: boolean | null;
  theirRelay: boolean;
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
export type Link = Pick<
  Session,
  'peer' | 'channel' | 'senders' | 'screenSender' | 'remoteStream' | 'iceServers' | 'ourRelay' | 'theirRelay'
>;

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
