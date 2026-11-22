import { isWorking } from '../../../core/webrtc/isWorking.ts';
import { restartPaths } from '../../../core/webrtc/restartPaths.ts';
import { sendMove } from '../../../core/webrtc/sendMove.ts';
import { turnServers } from '../../../core/webrtc/turnServers.ts';
import { type Session, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';
import { SessionRoute } from '../../sessions/types.ts';

// Gives up moving the call (`reason`, for the log) before it moved: the new connection is closed, and the call
// stays where it was. `tell`: let the other side know.
export const endMove = (session: Session, id: string, reason: string, tell: boolean): AppThunk => () => {
  const { move } = session;

  if (!move || move.id !== id || move.phase === MovePhase.Holding) {
    return;
  }

  move.timers.forEach(timer => window.clearTimeout(timer));
  move.other.peer.close();
  session.move = null;
  session.log(`${reason}; the call stays on the TURN relay.`);

  if (tell) {
    sendMove(session.key, { step: MoveStep.Abort, id });
  }

  // The leader renews the relay path instead, so a long call doesn't drop when the TURN credentials expire.
  if (!session.polite && session.route === SessionRoute.Relay && session.rescueSince === null
    && isWorking(session.peer) && turnServers().length > 0) {
    restartPaths(session, 'relay');
  }
};
