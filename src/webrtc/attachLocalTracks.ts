import { media, sessions } from './state.ts';

// Starts sending the local microphone/camera to `key`. Triggers renegotiation.
export const attachLocalTracks = (key: string) => {
  const session = sessions.get(key);
  const { localStream } = media;

  if (!session || !localStream) {
    return;
  }

  session.senders = localStream.getTracks().map(track => session.peer.addTrack(track, localStream));
};
