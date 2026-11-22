import { RECONNECT_DELAYS_MS } from '../../../core/webrtc/config.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from './connectContact.ts';
import { reconnectAttempts } from './reconnectAttempts.ts';

// After a connection dropped, tries again a few times with growing pauses.
export const scheduleReconnect = (id: string): AppThunk => (dispatch, getState) => {
  const attempt = reconnectAttempts.get(id) ?? 0;

  if (attempt >= RECONNECT_DELAYS_MS.length) {
    reconnectAttempts.delete(id);

    return;
  }

  reconnectAttempts.set(id, attempt + 1);
  window.setTimeout(() => {
    const status = getState().sessions.status[id];

    if (status === 'offline' && getState().contacts.list.some(c => c.id === id)) {
      void dispatch(connectContact(id));
    }
  }, RECONNECT_DELAYS_MS[attempt]);
};
