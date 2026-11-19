import { MANUAL_KEY } from '../../../webrtc/config.ts';
import { closeSession } from '../../../webrtc/closeSession.ts';
import { sessions } from '../../../webrtc/state.ts';
import type { Session } from '../../../webrtc/types.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import { connectionFailed, disconnected } from '../../manual/manualSlice.ts';
import { sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from '../call/endCall.ts';
import { scheduleReconnect } from '../contact/scheduleReconnect.ts';

const handled = new WeakSet<Session>();

// The connection closed or failed. Both events can fire for the same connection, so it is handled once.
export const sessionDropped = (session: Session): AppThunk => (dispatch, getState) => {
  const current = sessions.get(session.key);

  // Already replaced by a newer connection: nothing to update.
  if (handled.has(session) || (current && current !== session)) {
    return;
  }

  handled.add(session);

  const unexpected = !session.closing;
  const { key } = session;

  closeSession(session);

  if (getState().call.key === key) {
    dispatch(endCall('Call ended.'));
  }

  if (key === MANUAL_KEY) {
    // Closed by "Start over": the manual screen was already reset.
    if (!unexpected) {
      return;
    }

    dispatch(session.opened ? disconnected() : connectionFailed());
    dispatch(addMessage({ key, from: 'system', text: 'Connection closed.' }));

    return;
  }

  dispatch(sessionStatusChanged({ key, status: 'offline' }));

  if (unexpected && session.opened) {
    dispatch(scheduleReconnect(key));
  }
};
