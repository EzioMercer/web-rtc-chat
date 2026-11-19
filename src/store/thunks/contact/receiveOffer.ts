import { isPolite } from '../../../signaling/isPolite.ts';
import { sendSignal } from '../../../signaling/sendSignal.ts';
import type { SignalMessage } from '../../../signaling/types.ts';
import { closeSession } from '../../../webrtc/closeSession.ts';
import { createSession } from '../../../webrtc/createSession.ts';
import { sessions } from '../../../webrtc/state.ts';
import { waitForIceGathering } from '../../../webrtc/waitForIceGathering.ts';
import { sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from '../call/endCall.ts';
import { armTimeout } from './armTimeout.ts';

type Offer = Extract<SignalMessage, { t: 'offer' }>;

// A contact wants to connect: answer it.
export const receiveOffer = (id: string, offer: Offer): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const contact = getState().contacts.list.find(c => c.id === id);
  const existing = sessions.get(id);

  if (!contact || existing?.sid === offer.sid) {
    return;
  }

  if (existing) {
    // Both sides sent offers at once. The impolite side keeps its own offer, and sends it again in case the other
    // side wasn't listening yet when it went out; the polite side drops its own and answers.
    if (!existing.opened && existing.outgoing && !existing.polite) {
      if (existing.sentOffer) {
        await sendSignal(contact, { t: 'offer', sid: existing.sid, sdp: existing.sentOffer }).catch(() => undefined);
      }

      return;
    }

    // Otherwise they reconnected (e.g. reloaded the page): the old connection is dead.
    if (getState().call.key === id) {
      dispatch(endCall('Call ended.'));
    }

    closeSession(existing);
  }

  const polite = isPolite(contact.identity);
  const session = createSession({ key: id, sid: offer.sid, outgoing: false, polite }, dispatch);

  dispatch(sessionStatusChanged({ key: id, status: 'connecting' }));

  try {
    await session.peer.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    await session.peer.setLocalDescription(await session.peer.createAnswer());
    await waitForIceGathering(session.peer);

    if (sessions.get(id) !== session || !session.peer.localDescription) {
      return;
    }

    await sendSignal(contact, { t: 'answer', sid: offer.sid, sdp: session.peer.localDescription.sdp });
  } catch (err) {
    console.error('Could not answer contact', err);
    closeSession(session);
    dispatch(sessionStatusChanged({ key: id, status: 'offline' }));

    return;
  }

  dispatch(armTimeout(session));
};
