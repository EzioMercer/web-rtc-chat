import { TrackKind } from './TrackKind.ts';

// Whether `sender` (on `peer`) carries audio or video, even while it sends nothing.
export const senderKind = (peer: RTCPeerConnection, sender: RTCRtpSender): TrackKind => {
  const kind = peer.getTransceivers().find(t => t.sender === sender)?.receiver.track.kind ?? sender.track?.kind;

  return kind === 'video' ? TrackKind.Video : TrackKind.Audio;
};
