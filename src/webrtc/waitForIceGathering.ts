import { ICE_GATHERING_EARLY_MS, ICE_GATHERING_TIMEOUT_MS } from './config.ts';

// Resolves once all ICE candidates are gathered, so the code holds everything the peer needs.
// `early`: resolve as soon as a TURN relay address is there (usually the last kind to arrive), or after
// ICE_GATHERING_EARLY_MS: the request goes out sooner, and addresses found later are sent after it.
export const waitForIceGathering = (peer: RTCPeerConnection, early = false): Promise<void> => {
  if (peer.iceGatheringState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', onChange);
      peer.removeEventListener('icecandidate', onCandidate);
      resolve();
    };

    const onChange = () => {
      if (peer.iceGatheringState === 'complete') {
        done();
      }
    };

    const onCandidate = ({ candidate }: RTCPeerConnectionIceEvent) => {
      if (early && candidate?.type === 'relay') {
        done();
      }
    };

    const timer = setTimeout(done, early ? ICE_GATHERING_EARLY_MS : ICE_GATHERING_TIMEOUT_MS);

    peer.addEventListener('icegatheringstatechange', onChange);
    peer.addEventListener('icecandidate', onCandidate);
  });
};
