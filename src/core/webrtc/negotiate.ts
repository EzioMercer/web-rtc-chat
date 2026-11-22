import { errorText } from './errorText.ts';
import { sendControl } from './sendControl.ts';
import { type Session, ControlType } from './types.ts';

// Sends a new offer over the control channel when tracks are added or removed during a call.
// The first offer/answer goes through relays (or codes), so nothing is sent before the channel is open.
export const negotiate = async (session: Session) => {
  if (session.channel?.readyState !== 'open') {
    return;
  }

  try {
    session.makingOffer = true;
    await session.peer.setLocalDescription();

    if (session.peer.localDescription) {
      sendControl(session.key, { t: ControlType.Sdp, description: session.peer.localDescription.toJSON() });
      session.log(`Call setup: sent ${session.peer.localDescription.type}`);
    }
  } catch (err) {
    session.log(`Call setup failed (our offer): ${errorText(err)}`);
    console.error('Renegotiation failed', err);
  } finally {
    session.makingOffer = false;
  }
};
