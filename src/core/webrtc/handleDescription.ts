import { attachToOffer } from './attachToOffer.ts';
import { errorText } from './errorText.ts';
import { tuneSenders } from './tuneSenders.ts';
import { sendControl } from './sendControl.ts';
import { sessions } from './state.ts';
import { ControlType } from './types.ts';

// Applies an offer or answer received over the control channel (perfect negotiation). Our answer to an offer
// goes back over the control channel, or through `reply` (e.g. through the relays, when the path is broken).
export const handleDescription = async (
  key: string,
  description: RTCSessionDescriptionInit,
  reply?: () => Promise<void>,
) => {
  const session = sessions.get(key);

  if (!session) {
    return;
  }

  const { peer } = session;
  const collision = description.type === 'offer' && (session.makingOffer || peer.signalingState !== 'stable');

  session.ignoreOffer = !session.polite && collision;

  if (session.ignoreOffer) {
    session.log('Call setup: both sides offered at once; keeping ours');

    return;
  }

  session.log(`Call setup: got ${description.type}${collision ? ' (both offered; yielding)' : ''}`);

  try {
    // On a collision the polite peer rolls back its own offer implicitly here.
    await peer.setRemoteDescription(description);

    if (description.type === 'offer' && session.attachOnOffer) {
      session.attachOnOffer = false;
      await attachToOffer(session);
    }

    if (description.type === 'offer') {
      await peer.setLocalDescription();

      if (reply) {
        await reply();
      } else if (peer.localDescription) {
        sendControl(key, { t: ControlType.Sdp, description: peer.localDescription.toJSON() });
        session.log(`Call setup: sent ${peer.localDescription.type}`);
      }
    }

    // Video tracks may have just started: keep them within the relay limit.
    await tuneSenders(session);
  } catch (err) {
    session.log(`Call setup failed (their ${description.type}): ${errorText(err)}`);
    throw err;
  }
};
