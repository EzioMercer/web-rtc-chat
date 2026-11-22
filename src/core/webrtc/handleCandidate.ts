import { sessions } from './state.ts';

// Adds an ICE candidate received over the control channel.
export const handleCandidate = async (key: string, candidate: RTCIceCandidateInit) => {
  const session = sessions.get(key);

  try {
    await session?.peer.addIceCandidate(candidate);
  } catch (err) {
    // Candidates of an offer we ignored on purpose are expected to fail.
    if (!session?.ignoreOffer) {
      session?.log(`Could not add a network address: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
};
