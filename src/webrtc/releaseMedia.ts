import { media, sessions } from './state.ts';

// Stops the camera/microphone and stops sending them to `key`.
export const releaseMedia = (key: string | null) => {
  const session = key ? sessions.get(key) : undefined;

  media.localStream?.getTracks().forEach(track => track.stop());
  media.localStream = null;

  if (!session) {
    return;
  }

  if (session.peer.signalingState !== 'closed') {
    session.senders.forEach(sender => session.peer.removeTrack(sender));
  }

  session.senders = [];
  session.remoteStream = null;
};
