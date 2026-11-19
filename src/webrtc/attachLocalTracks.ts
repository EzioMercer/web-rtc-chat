import { media, sessions } from './state.ts';

// Starts sending the local microphone/camera to `key`. Triggers renegotiation.
export const attachLocalTracks = (key: string) => {
  const session = sessions.get(key);
  const { localStream } = media;

  if (!session || !localStream) {
    session?.log('Call setup: no camera/microphone stream to send');

    return;
  }

  session.senders = localStream.getTracks().map(track => session.peer.addTrack(track, localStream));
  session.log(`Sending our ${localStream.getTracks().map(track => track.kind).join(' and ')}`);
};
