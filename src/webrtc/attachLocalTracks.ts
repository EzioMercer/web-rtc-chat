import { rtc } from './state.ts';

// Starts sending the local microphone/camera to the peer. Triggers renegotiation.
export const attachLocalTracks = () => {
  const { peer, localStream } = rtc;

  if (!peer || !localStream) {
    return;
  }

  rtc.senders = localStream.getTracks().map(track => peer.addTrack(track, localStream));
};
