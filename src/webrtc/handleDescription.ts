import { sendControl } from './sendControl.ts';
import { rtc } from './state.ts';

// Applies an offer or answer received over the control channel (perfect negotiation).
export const handleDescription = async (description: RTCSessionDescriptionInit) => {
  const { peer } = rtc;

  if (!peer) {
    return;
  }

  const collision = description.type === 'offer' && (rtc.makingOffer || peer.signalingState !== 'stable');

  rtc.ignoreOffer = !rtc.polite && collision;

  if (rtc.ignoreOffer) {
    return;
  }

  // On a collision the polite peer rolls back its own offer implicitly here.
  await peer.setRemoteDescription(description);

  if (description.type === 'offer') {
    await peer.setLocalDescription();

    if (peer.localDescription) {
      sendControl({ t: 'sdp', description: peer.localDescription.toJSON() });
    }
  }
};
