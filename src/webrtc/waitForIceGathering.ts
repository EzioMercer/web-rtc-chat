import { ICE_GATHERING_TIMEOUT_MS } from './config.ts';

// Resolves once all ICE candidates are gathered, so the code holds everything the peer needs.
export const waitForIceGathering = (peer: RTCPeerConnection): Promise<void> => {
  if (peer.iceGatheringState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };

    const onChange = () => {
      if (peer.iceGatheringState === 'complete') {
        done();
      }
    };

    const timer = setTimeout(done, ICE_GATHERING_TIMEOUT_MS);

    peer.addEventListener('icegatheringstatechange', onChange);
  });
};
