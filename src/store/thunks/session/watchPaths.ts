import { PATH_CHECK_MS, TURN_RESTART_MS } from '../../../core/webrtc/config.ts';
import { restartPaths } from '../../../core/webrtc/restartPaths.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { ensureTurnServers, turnServers } from '../../../core/webrtc/turnServers.ts';
import type { Session } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';
import { noteConnected } from '../contact/noteConnected.ts';
import { startMove } from '../move/startMove.ts';
import { checkRoute } from './checkRoute.ts';
import { refreshIceServers } from './rescuePath.ts';
import { SessionRoute } from '../../sessions/types.ts';
import { CallStatus } from '../../call/types.ts';

let timer: number | null = null;

// On the relay, look for a direct path again. One side does it (the other answers), so the searches don't collide;
// without fresh TURN credentials it waits, so the current relay path isn't lost.
// Outside a call, the connection searches for a new path itself: a direct one if it works now, otherwise the relay
// with fresh credentials. During a call, a direct path found that way could hold for a moment only and take the
// call down with it, so a separate direct connection is tested first and the call moves only if it holds (see
// startMove); if not, the relay path is renewed.
const searchIfRelay = (session: Session): AppThunk => (dispatch, getState) => {
  if (session.route !== SessionRoute.Relay || session.polite || turnServers().length === 0 || session.move
    || session.rescueSince !== null || Date.now() - session.restartedAt < TURN_RESTART_MS) {
    return;
  }

  const { status, key } = getState().call;

  // A call that is still ringing: wait until it is answered.
  if (key === session.key && status !== CallStatus.Idle && status !== CallStatus.Active) {
    return;
  }

  session.restartedAt = Date.now();

  if (key === session.key && status === CallStatus.Active) {
    dispatch(startMove(session));
  } else {
    restartPaths(session, 'all');
  }
};

const check = (): AppThunk<Promise<void>> => async (dispatch) => {
  const open = [...sessions.values()].filter(s => s.opened && s.peer.connectionState !== 'closed');

  if (open.length === 0) {
    return;
  }

  await ensureTurnServers();

  for (const session of open) {
    if (session.peer.connectionState === 'connected') {
      dispatch(noteConnected(session.key, true));
    }

    // Before they expire, give the connection new TURN credentials, so the next path search (ours or the other
    // side's) uses them.
    await refreshIceServers(session);
    await dispatch(checkRoute(session));
    dispatch(searchIfRelay(session));
  }
};

// Keeps an eye on every open connection, and keeps its contact's "last connected" time fresh, once a minute (started
// when the first one opens).
export const watchPaths = (): AppThunk => (dispatch) => {
  timer ??= window.setInterval(() => void dispatch(check()), PATH_CHECK_MS);
};
