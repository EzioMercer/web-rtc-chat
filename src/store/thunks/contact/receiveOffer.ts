import { isPolite } from '../../../signaling/isPolite.ts';
import { sendSignal } from '../../../signaling/sendSignal.ts';
import type { SignalMessage } from '../../../signaling/types.ts';
import { closeSession } from '../../../webrtc/closeSession.ts';
import { createSession } from '../../../webrtc/createSession.ts';
import { sessions } from '../../../webrtc/state.ts';
import { ensureTurnServers } from '../../../webrtc/turnServers.ts';
import { waitForIceGathering } from '../../../webrtc/waitForIceGathering.ts';
import { describeCandidates } from '../../../webrtc/describeCandidates.ts';
import { addRemoteCandidates } from '../../../webrtc/addRemoteCandidates.ts';
import { takeEarlyCandidates } from '../../../webrtc/earlyCandidates.ts';
import { sessionDetail, sessionLogged, sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from '../call/endCall.ts';
import { armTimeout } from './armTimeout.ts';

type Offer = Extract<SignalMessage, { t: 'offer' }>;

// A contact wants to connect: answer it.
export const receiveOffer = (id: string, offer: Offer): AppThunk<Promise<void>> => async (dispatch, getState) => {
  // Fetched before looking at the current state, which may change meanwhile.
  await ensureTurnServers();

  const contact = getState().contacts.list.find(c => c.id === id);
  const existing = sessions.get(id);

  if (!contact || existing?.sid === offer.sid) {
    return;
  }

  if (existing) {
    // Both sides sent offers at once. The impolite side keeps its own offer, and sends it again in case the other
    // side wasn't listening yet when it went out; the polite side drops its own and answers.
    if (!existing.opened && existing.outgoing && !existing.polite) {
      dispatch(sessionLogged({ key: id, text: 'Both sides asked at once; keeping ours and sending it again.' }));

      if (existing.sentOffer) {
        await sendSignal(contact, { t: 'offer', sid: existing.sid, sdp: existing.sentOffer }).catch(() => undefined);
      }

      return;
    }

    // Otherwise they started over (e.g. reloaded the page): the old connection is dead.
    dispatch(sessionLogged({ key: id, text: 'They started a new attempt; dropping the previous one.' }));

    if (getState().call.key === id) {
      dispatch(endCall('Call ended.'));
    }

    closeSession(existing);
  }

  const polite = isPolite(contact.identity);
  const session = createSession({ key: id, sid: offer.sid, outgoing: false, polite }, dispatch);

  dispatch(sessionStatusChanged({ key: id, status: 'connecting' }));
  dispatch(sessionDetail({ key: id, detail: 'They are asking to connect. Answering…' }));
  dispatch(sessionLogged({ key: id, text: `Their addresses: ${describeCandidates(offer.sdp)}` }));

  try {
    await session.peer.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    await addRemoteCandidates(session, takeEarlyCandidates(id, offer.sid));
    await session.peer.setLocalDescription(await session.peer.createAnswer());
    await waitForIceGathering(session.peer, true);

    if (sessions.get(id) !== session || !session.peer.localDescription) {
      return;
    }

    const sdp = session.peer.localDescription.sdp;

    session.signaled = true;
    await sendSignal(contact, { t: 'answer', sid: offer.sid, sdp });
    dispatch(sessionDetail({ key: id, detail: 'Answered. Opening the direct connection…' }));
  } catch (err) {
    console.error('Could not answer contact', err);
    closeSession(session);
    dispatch(sessionStatusChanged({ key: id, status: 'offline' }));

    return;
  }

  dispatch(armTimeout(session));
};
