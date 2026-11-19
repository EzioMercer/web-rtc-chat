import { sessions } from './state.ts';
import type { Session } from './types.ts';

// Closes the connection on purpose (it won't reconnect).
export const closeSession = (session: Session) => {
  session.closing = true;
  session.channel?.close();
  session.peer.close();

  if (sessions.get(session.key) === session) {
    sessions.delete(session.key);
  }
};
