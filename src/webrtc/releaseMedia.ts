import { media, sessions } from './state.ts';

// Stops the camera/microphone and stops sending them to `key`.
export const releaseMedia = (key: string | null) => {
  const session = key ? sessions.get(key) : undefined;

  media.localStream?.getTracks().forEach(track => track.stop());
  media.localStream = null;
  media.screen?.stream.getTracks().forEach(track => track.stop());
  media.screen = null;

  if (!session) {
    return;
  }

  // Stop sending without renegotiating: both sides hang up at once, and two simultaneous renegotiations are
  // exactly what we avoid. The next call gets fresh audio/video slots.
  if (session.peer.signalingState !== 'closed') {
    session.senders.forEach(sender => void sender.replaceTrack(null).catch(() => undefined));
  }

  session.senders = [];
  session.screenSender = null;
  session.attachOnOffer = false;
  session.remoteStream = null;
};
