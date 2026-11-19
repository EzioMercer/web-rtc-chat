import { CONNECT_TIMEOUT_MS } from '../../../webrtc/config.ts';
import { closeSession } from '../../../webrtc/closeSession.ts';
import { sessions } from '../../../webrtc/state.ts';
import type { Session } from '../../../webrtc/types.ts';
import { failureDetail } from '../../../webrtc/failureDetail.ts';
import { sessionDetail, sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { reconnectAttempts } from './reconnectAttempts.ts';
import { scheduleReconnect } from './scheduleReconnect.ts';

// Gives up on `session` if it hasn't connected in time: the contact is offline.
export const armTimeout = (session: Session): AppThunk => (dispatch) => {
  window.setTimeout(() => {
    if (sessions.get(session.key) === session && !session.opened) {
      dispatch(sessionDetail({ key: session.key, detail: failureDetail(session) }));
      closeSession(session);
      dispatch(sessionStatusChanged({ key: session.key, status: 'offline' }));

      // Part of reconnecting after a drop: try again later.
      if (reconnectAttempts.has(session.key)) {
        dispatch(scheduleReconnect(session.key));
      }
    }
  }, CONNECT_TIMEOUT_MS);
};
