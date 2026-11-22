import { PATH_CHECK_MS, TURN_RESTART_MS } from '../../../core/webrtc/config.ts';
import { configureIce } from '../../../core/webrtc/configureIce.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { ensureTurnServers, turnServers } from '../../../core/webrtc/turnServers.ts';
import type { Session } from '../../../core/webrtc/types.ts';
import type { AppDispatch, AppThunk, RootState } from '../../store.ts';
import { checkRoute } from './checkRoute.ts';
import { refreshIceServers } from './rescuePath.ts';
import { SessionRoute } from '../../sessions/types.ts';
import { CallStatus } from '../../call/types.ts';

let timer: number | null = null;

// On the relay, search for a path again: a direct one if it works now, otherwise the relay with fresh credentials,
// so the connection doesn't drop when the old ones expire. One side does it (the other answers), so the searches
// don't collide; without fresh credentials it waits, so the current relay path isn't lost.
// During a call the search offers only our relay addresses, so it just renews the relay path: a direct path found
// mid-call can hold for a moment only (the relay path is let go by then), and the call would drop with it.
const restartIfRelay = (session: Session, inCall: boolean) => {
  if (session.route !== SessionRoute.Relay || session.polite || turnServers().length === 0
    || Date.now() - session.restartedAt < TURN_RESTART_MS) {
    return;
  }

  session.restartedAt = Date.now();

  const policy: RTCIceTransportPolicy = inCall ? 'relay' : 'all';
  const set = session.peer.getConfiguration().iceTransportPolicy === policy
    || configureIce(session, { iceTransportPolicy: policy });

  // Without relay-only addresses, the search could move the call to a direct path: better skip it.
  if (!set && inCall) {
    return;
  }

  session.log(inCall ? 'Renewing the TURN relay path (kept during the call)…' : 'Looking for a direct path again…');
  session.peer.restartIce();
};

const check = async (dispatch: AppDispatch, getState: () => RootState) => {
  const open = [...sessions.values()].filter(s => s.opened && s.peer.connectionState !== 'closed');

  if (open.length === 0) {
    return;
  }

  await ensureTurnServers();

  for (const session of open) {
    const { status, key } = getState().call;

    // Before they expire, give the connection new TURN credentials, so the next path search (ours or the other
    // side's) uses them.
    await refreshIceServers(session);
    await dispatch(checkRoute(session));
    restartIfRelay(session, status !== CallStatus.Idle && key === session.key);
  }
};

// Keeps an eye on every open connection, once a minute (started when the first one opens).
export const watchPaths = (): AppThunk => (dispatch, getState) => {
  timer ??= window.setInterval(() => void check(dispatch, getState), PATH_CHECK_MS);
};
