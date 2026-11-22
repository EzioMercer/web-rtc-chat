import { sendSignal } from '../../../core/signaling/sendSignal.ts';
import { MANUAL_KEY, RESCUE_TIMEOUT_MS, STUN_SERVERS } from '../../../core/webrtc/config.ts';
import { configureIce } from '../../../core/webrtc/configureIce.ts';
import { errorText } from '../../../core/webrtc/errorText.ts';
import { isWorking } from '../../../core/webrtc/isWorking.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { ensureTurnServers, turnServers } from '../../../core/webrtc/turnServers.ts';
import type { Session } from '../../../core/webrtc/types.ts';
import { waitForIceGathering } from '../../../core/webrtc/waitForIceGathering.ts';
import type { AppThunk } from '../../store.ts';
import { checkRoute } from './checkRoute.ts';
import { sessionDropped } from './sessionDropped.ts';
import { SignalType } from '../../../core/signaling/types.ts';

// Ends the search if the connection works (again): a new path was found, or the old one came back.
export const finishRescue = (session: Session): AppThunk => (dispatch) => {
  if (session.rescueSince === null || !isWorking(session.peer)) {
    return;
  }

  session.log(`Found a path again after ${((Date.now() - session.rescueSince) / 1000).toFixed(1)}s.`);
  session.rescueSince = null;
  void dispatch(checkRoute(session));
};

// Marks `session` as looking for a new path. If none is found in time, the connection is dropped and built again
// from scratch (the usual reconnect). Returns false if it was already looking.
export const startRescue = (session: Session, reason: string): AppThunk<boolean> => (dispatch) => {
  if (session.rescueSince !== null) {
    return false;
  }

  session.rescueSince = Date.now();
  session.restartedAt = Date.now();
  session.log(reason);

  window.setTimeout(() => {
    // A search that finished without the browser reporting a change (the path was fine by then).
    dispatch(finishRescue(session));

    if (sessions.get(session.key) === session && session.rescueSince !== null) {
      session.log(`No new path within ${RESCUE_TIMEOUT_MS / 1000}s; starting over.`);
      dispatch(sessionDropped(session));
    }
  }, RESCUE_TIMEOUT_MS);

  return true;
};

// Gives the connection fresh TURN credentials, so the next path search can use the relay. With `policy`, that
// search also offers only relay addresses ('relay') or every kind ('all').
export const refreshIceServers = async (session: Session, policy?: RTCIceTransportPolicy) => {
  await ensureTurnServers();

  const fresh = turnServers();
  const renew = fresh.length > 0 && fresh !== session.iceServers;
  const changes: RTCConfiguration = renew ? { iceServers: [...STUN_SERVERS, ...fresh] } : {};

  if (policy && session.peer.getConfiguration().iceTransportPolicy !== policy) {
    changes.iceTransportPolicy = policy;
  }

  if (Object.keys(changes).length > 0 && configureIce(session, changes) && renew) {
    session.iceServers = fresh;
  }
};

// The open connection lost its network path (the browser says "disconnected"). Instead of waiting for it to fail
// and building a new connection, search for a new path right away, direct or through TURN, keeping the
// connection (chat and calls go on once found). The search request goes through the relays, since the broken
// connection can't carry it. Both sides may start at once; the usual rule (the polite side yields) settles it.
export const rescuePath = (session: Session): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { key, peer } = session;
  const contact = getState().contacts.list.find(c => c.id === key);

  if (key === MANUAL_KEY || !contact || !session.opened || sessions.get(key) !== session
    || !dispatch(startRescue(session, 'Lost the network path. Looking for a new one (direct or TURN)…'))) {
    return;
  }

  // The path is broken anyway, so every kind is tried, even in a call that stayed on the relay (see watchPaths).
  await refreshIceServers(session, 'all');

  // Another search or a call setup is half done: it carries on, and the timeout above still applies.
  if (peer.signalingState !== 'stable' || sessions.get(key) !== session) {
    return;
  }

  try {
    session.makingOffer = true;
    await peer.setLocalDescription(await peer.createOffer({ iceRestart: true }));
  } catch (err) {
    session.log(`Could not start the new path search: ${errorText(err)}`);

    return;
  } finally {
    session.makingOffer = false;
  }

  // Every address in the request: ones found later couldn't be sent.
  await waitForIceGathering(peer);

  if (sessions.get(key) !== session || peer.localDescription?.type !== 'offer') {
    return;
  }

  try {
    await sendSignal(contact, { t: SignalType.Path, sid: session.sid, type: 'offer', sdp: peer.localDescription.sdp });
    dispatch(finishRescue(session));
    session.log('Sent the new path search through the relays.');
  } catch (err) {
    session.log(`Could not send the new path search: ${errorText(err)}`);
  }
};
