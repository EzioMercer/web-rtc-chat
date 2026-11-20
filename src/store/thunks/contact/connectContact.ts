import { nanoid } from '@reduxjs/toolkit';
import { isPolite } from '../../../signaling/isPolite.ts';
import { sendSignal } from '../../../signaling/sendSignal.ts';
import { RELAYS } from '../../../nostr/config.ts';
import { bindChannel } from '../../../webrtc/bindChannel.ts';
import { closeSession } from '../../../webrtc/closeSession.ts';
import { CONTROL_LABEL, PATH_TIMEOUT_MS, PREPARE_TIMEOUT_MS } from '../../../webrtc/config.ts';
import { createSession } from '../../../webrtc/createSession.ts';
import { sessions } from '../../../webrtc/state.ts';
import { ensureTurnServers } from '../../../webrtc/turnServers.ts';
import { waitForIceGathering } from '../../../webrtc/waitForIceGathering.ts';
import { sessionDetail, sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { armTimeout } from './armTimeout.ts';

// Contact id -> when our current attempt started preparing (before its connection exists).
const preparing = new Map<string, number>();

// An attempt that is still alive. One that got stuck (e.g. the phone froze the app in the middle of it) doesn't
// count, so it can't block new attempts forever.
const attemptAlive = (id: string) => {
  const started = preparing.get(id);
  const session = sessions.get(id);

  return (started !== undefined && Date.now() - started < PREPARE_TIMEOUT_MS)
    || (session !== undefined && !session.opened && Date.now() - session.restartedAt < PATH_TIMEOUT_MS);
};

// Tries to open a direct connection to a contact by sending an offer to their mailbox.
// If they are online, their app answers on its own.
export const connectContact = (id: string): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const contact = getState().contacts.list.find(c => c.id === id);
  const status = getState().sessions.status[id];

  if (!contact || status === 'connected' || (status === 'connecting' && attemptAlive(id))) {
    return;
  }

  const old = sessions.get(id);
  const started = Date.now();

  preparing.set(id, started);
  dispatch(sessionStatusChanged({ key: id, status: 'connecting' }));
  dispatch(sessionDetail({ key: id, detail: 'Preparing…' }));

  try {
    await ensureTurnServers();
  } finally {
    if (preparing.get(id) === started) {
      preparing.delete(id);
    }
  }

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
    await waitForIceGathering(session.peer, true);

    // An offer from them arrived meanwhile and replaced this attempt.
    if (sessions.get(id) !== session || !session.peer.localDescription) {
      return;
    }

    session.sentOffer = session.peer.localDescription.sdp;
    session.signaled = true;

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
