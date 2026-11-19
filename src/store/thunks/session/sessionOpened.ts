import { safetyWords } from '../../../signaling/safetyWords.ts';
import { MANUAL_KEY } from '../../../webrtc/config.ts';
import { getFingerprints } from '../../../webrtc/getFingerprints.ts';
import { getRoute } from '../../../webrtc/getRoute.ts';
import type { Session } from '../../../webrtc/types.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import { connected } from '../../manual/manualSlice.ts';
import { sessionDetail, sessionRouteChanged, sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { reconnectAttempts } from '../contact/reconnectAttempts.ts';
import { startRotation } from '../contact/startRotation.ts';

// The direct connection is open.
export const sessionOpened = (session: Session): AppThunk<Promise<void>> => async (dispatch) => {
  session.opened = true;

  const route = await getRoute(session.peer).catch(() => 'direct' as const);

  session.log(route === 'relay' ? 'Connected through the TURN relay.' : 'Connected directly.');

  if (session.key === MANUAL_KEY) {
    // No identities here, so the safety words come from the two certificate fingerprints.
    const local = getFingerprints(session.peer.localDescription?.sdp).join(',');
    const remote = getFingerprints(session.peer.remoteDescription?.sdp).join(',');

    dispatch(connected(await safetyWords(local, remote)));
    dispatch(addMessage({ key: MANUAL_KEY, from: 'system', text: 'Connected. Say hi!' }));

    return;
  }

  reconnectAttempts.delete(session.key);
  dispatch(sessionStatusChanged({ key: session.key, status: 'connected' }));
  dispatch(sessionRouteChanged({ key: session.key, route }));
  dispatch(sessionDetail({ key: session.key, detail: '' }));
  dispatch(startRotation(session.key));
};
