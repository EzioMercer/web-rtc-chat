import { sendControl } from './sendControl.ts';
import { sessions } from './state.ts';

// Applies an offer or answer received over the control channel (perfect negotiation).
export const handleDescription = async (key: string, description: RTCSessionDescriptionInit) => {
  const session = sessions.get(key);

  if (!session) {
    return;
  }

  const { peer } = session;
  const collision = description.type === 'offer' && (session.makingOffer || peer.signalingState !== 'stable');

  session.ignoreOffer = !session.polite && collision;

  if (session.ignoreOffer) {
    return;
  }

  // On a collision the polite peer rolls back its own offer implicitly here.
  await peer.setRemoteDescription(description);

  if (description.type === 'offer') {
    await peer.setLocalDescription();

    if (peer.localDescription) {
      sendControl(key, { t: 'sdp', description: peer.localDescription.toJSON() });
    }
  }
};
