import { encodeCode } from './encodeCode.ts';
import { waitForIceGathering } from './waitForIceGathering.ts';

// Code for the local description, including all gathered ICE candidates.
export const createLocalCode = async (peer: RTCPeerConnection): Promise<string> => {
  await waitForIceGathering(peer);

  if (!peer.localDescription) {
    throw new Error('No local description');
  }

  return encodeCode(peer.localDescription);
};
