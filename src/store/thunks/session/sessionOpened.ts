import { safetyWords } from '../../../core/signaling/safetyWords.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { getFingerprints } from '../../../core/webrtc/getFingerprints.ts';
import type { Session } from '../../../core/webrtc/types.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import { connected } from '../../manual/manualSlice.ts';
import { sessionDetail, sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { reconnectAttempts } from '../contact/reconnectAttempts.ts';
import { startRotation } from '../contact/startRotation.ts';
import { sendPending } from '../chat/sendPending.ts';
import { checkRoute } from './checkRoute.ts';
import { watchPaths } from './watchPaths.ts';
import { SessionStatus } from '../../sessions/types.ts';
import { MessageAuthor } from '../../chat/types.ts';

// The direct connection is open.
export const sessionOpened = (session: Session): AppThunk<Promise<void>> => async (dispatch) => {
  session.opened = true;

  await dispatch(checkRoute(session));

  // Chrome says right away when the path changes (e.g. after a path search); elsewhere the minute check notices.
  const ice = session.peer.sctp?.transport.iceTransport;

  ice?.addEventListener('selectedcandidatepairchange', () => void dispatch(checkRoute(session)));
  dispatch(watchPaths());

  dispatch(sendPending(session.key));

  if (session.key === MANUAL_KEY) {
    // No identities here, so the safety words come from the two certificate fingerprints.
    const local = getFingerprints(session.peer.localDescription?.sdp).join(',');
    const remote = getFingerprints(session.peer.remoteDescription?.sdp).join(',');

    dispatch(connected(await safetyWords(local, remote)));
    dispatch(addMessage({ key: MANUAL_KEY, from: MessageAuthor.System, text: 'Connected. Say hi!' }));

    return;
  }

  reconnectAttempts.delete(session.key);
  dispatch(sessionStatusChanged({ key: session.key, status: SessionStatus.Connected }));
  dispatch(sessionDetail({ key: session.key, detail: '' }));
  dispatch(startRotation(session.key));
};
