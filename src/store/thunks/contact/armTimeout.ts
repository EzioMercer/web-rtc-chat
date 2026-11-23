import { ANSWER_TIMEOUT_MS, PATH_TIMEOUT_MS } from '../../../core/webrtc/config.ts';
import { closeSession } from '../../../core/webrtc/closeSession.ts';
import { failureDetail } from '../../../core/webrtc/failureDetail.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import type { Session } from '../../../core/webrtc/types.ts';
import { sessionDetail, sessionLogged, sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { reconnectAttempts } from './reconnectAttempts.ts';
import { scheduleReconnect } from './scheduleReconnect.ts';
import { SessionStatus } from '../../sessions/types.ts';

// Gives up on `session` if it hasn't connected in time. Waiting for the answer and finding a network path are
// timed separately: a path can take much longer, and cutting it short makes both sides start over forever.
export const armTimeout = (session: Session): AppThunk => (dispatch) => {
  // A replaced attempt's connection is closed, and Firefox throws when a closed connection is read, so this is
  // checked before anything else.
  const stillTrying = () => sessions.get(session.key) === session && !session.opened;

  const giveUp = (reason: string) => {
    if (!stillTrying()) {
      return;
    }

    dispatch(sessionLogged({ key: session.key, text: reason }));
    dispatch(sessionDetail({ key: session.key, detail: failureDetail(session) }));
    closeSession(session);
    dispatch(sessionStatusChanged({ key: session.key, status: SessionStatus.Offline }));

    // Part of reconnecting after a drop: try again later.
    if (reconnectAttempts.has(session.key)) {
      dispatch(scheduleReconnect(session.key));
    }
  };

  window.setTimeout(() => {
    if (stillTrying() && !session.peer.remoteDescription) {
      giveUp(`No answer within ${ANSWER_TIMEOUT_MS / 1000}s.`);
    }
  }, ANSWER_TIMEOUT_MS);
  window.setTimeout(() => giveUp(`No network path within ${PATH_TIMEOUT_MS / 1000}s.`), PATH_TIMEOUT_MS);
};
