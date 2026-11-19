import { rtc } from './state.ts';

// Stops the camera/microphone and stops sending them to the peer.
export const releaseMedia = () => {
  const { peer } = rtc;

  rtc.localStream?.getTracks().forEach(track => track.stop());

  if (peer && peer.signalingState !== 'closed') {
    rtc.senders.forEach(sender => peer.removeTrack(sender));
  }

  rtc.senders = [];
  rtc.localStream = null;
  rtc.remoteStream = null;
};
