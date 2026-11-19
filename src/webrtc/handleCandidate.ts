import { rtc } from './state.ts';

// Adds an ICE candidate received over the control channel.
export const handleCandidate = async (candidate: RTCIceCandidateInit) => {
  try {
    await rtc.peer?.addIceCandidate(candidate);
  } catch (err) {
    // Candidates of an offer we ignored on purpose are expected to fail.
    if (!rtc.ignoreOffer) {
      console.error('Could not add ICE candidate', err);
    }
  }
};
