import { nanoid } from '@reduxjs/toolkit';
import { isPolite } from '../../../signaling/isPolite.ts';
import { sendSignal } from '../../../signaling/sendSignal.ts';
import { RELAYS } from '../../../nostr/config.ts';
import { bindChannel } from '../../../webrtc/bindChannel.ts';
import { closeSession } from '../../../webrtc/closeSession.ts';
import { CONTROL_LABEL } from '../../../webrtc/config.ts';
import { createSession } from '../../../webrtc/createSession.ts';
import { sessions } from '../../../webrtc/state.ts';
import { ensureTurnServers } from '../../../webrtc/turnServers.ts';
import { waitForIceGathering } from '../../../webrtc/waitForIceGathering.ts';
import { sessionDetail, sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { armTimeout } from './armTimeout.ts';

// Tries to open a direct connection to a contact by sending an offer to their mailbox.
// If they are online, their app answers on its own.
export const connectContact = (id: string): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const contact = getState().contacts.list.find(c => c.id === id);
  const status = getState().sessions.status[id];

  if (!contact || status === 'connecting' || status === 'connected') {
    return;
  }

  const old = sessions.get(id);

  dispatch(sessionStatusChanged({ key: id, status: 'connecting' }));
  dispatch(sessionDetail({ key: id, detail: 'Preparing…' }));
  await ensureTurnServers();

  // Their offer arrived while we waited, and is being answered.
  if (sessions.get(id) !== old) {
    return;
  }

  if (old) {
    closeSession(old);
  }

  const polite = isPolite(contact.identity);
  const session = createSession({ key: id, sid: nanoid(), outgoing: true, polite }, dispatch);

  bindChannel(session, session.peer.createDataChannel(CONTROL_LABEL), dispatch);

  try {
    await session.peer.setLocalDescription(await session.peer.createOffer());
    await waitForIceGathering(session.peer);

    // An offer from them arrived meanwhile and replaced this attempt.
    if (sessions.get(id) !== session || !session.peer.localDescription) {
      return;
    }

    session.sentOffer = session.peer.localDescription.sdp;

    const relays = await sendSignal(contact, { t: 'offer', sid: session.sid, sdp: session.sentOffer });

    // Replaced by their attempt while the request was on its way.
    if (sessions.get(id) !== session) {
      return;
    }

    const detail = `Asked through ${relays} of ${RELAYS.length} relays. Waiting for an answer…`;

    dispatch(sessionDetail({ key: id, detail }));
  } catch (err) {
    console.error('Could not reach contact', err);
    closeSession(session);
    dispatch(sessionStatusChanged({ key: id, status: 'offline' }));
    dispatch(sessionDetail({ key: id, detail: err instanceof Error ? err.message : 'Could not send the request.' }));

    return;
  }

  dispatch(armTimeout(session));
};
