import { sessions } from './state.ts';
import type { Session } from './types.ts';

// Closes the connection on purpose (it won't reconnect), and the second one of a call that is moving.
export const closeSession = (session: Session) => {
  session.closing = true;
  session.channel?.close();
  session.peer.close();

  if (session.move) {
    session.move.timers.forEach(timer => window.clearTimeout(timer));
    session.move.other.peer.close();
    session.move = null;
  }

  if (sessions.get(session.key) === session) {
    sessions.delete(session.key);
  }
};
