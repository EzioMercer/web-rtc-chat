import { ICE_GATHERING_EARLY_MS, ICE_GATHERING_TIMEOUT_MS } from './config.ts';

// Gathering finished, with addresses in the description. (Right after a new path search starts, the state can
// still say "complete" from the previous search, with none of the new addresses yet.)
const gathered = (peer: RTCPeerConnection) => peer.iceGatheringState === 'complete'
  && (peer.localDescription?.sdp.includes('a=candidate') ?? false);

// Resolves once all ICE candidates are gathered, so the code holds everything the peer needs.
// `early`: resolve as soon as a TURN relay address is there (usually the last kind to arrive), or after
// ICE_GATHERING_EARLY_MS: the request goes out sooner, and addresses found later are sent after it.
export const waitForIceGathering = (peer: RTCPeerConnection, early = false): Promise<void> => {
  if (gathered(peer)) {
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
      if (gathered(peer)) {
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
