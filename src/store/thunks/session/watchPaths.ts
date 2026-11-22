import { PATH_CHECK_MS, STUN_SERVERS, TURN_RESTART_MS } from '../../../core/webrtc/config.ts';
import { errorText } from '../../../core/webrtc/errorText.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { ensureTurnServers, turnServers } from '../../../core/webrtc/turnServers.ts';
import type { Session } from '../../../core/webrtc/types.ts';
import type { AppDispatch, AppThunk } from '../../store.ts';
import { checkRoute } from './checkRoute.ts';

let timer: number | null = null;

// TURN credentials expire after an hour. Before they do, give the connection the new ones, so the next path search
// (ours or the other side's) uses them.
const renewCredentials = (session: Session) => {
  const fresh = turnServers();

  if (fresh.length === 0 || fresh === session.iceServers) {
    return;
  }

  try {
    session.peer.setConfiguration({ iceServers: [...STUN_SERVERS, ...fresh] });
    session.iceServers = fresh;
  } catch (err) {
    session.log(`Could not renew the TURN relay credentials: ${errorText(err)}`);
  }
};

// On the relay, search for a path again: a direct one if it works now, otherwise the relay with fresh credentials,
// so a call doesn't drop when the old ones expire. One side does it (the other answers), so the searches don't
// collide; without fresh credentials it waits, so the current relay path isn't lost.
const restartIfRelay = (session: Session) => {
  if (session.route !== 'relay' || session.polite || turnServers().length === 0
    || Date.now() - session.restartedAt < TURN_RESTART_MS) {
    return;
  }

  session.restartedAt = Date.now();
  session.log('Looking for a direct path again…');
  session.peer.restartIce();
};

const check = async (dispatch: AppDispatch) => {
  const open = [...sessions.values()].filter(s => s.opened && s.peer.connectionState !== 'closed');

  if (open.length === 0) {
    return;
  }

  await ensureTurnServers();

  for (const session of open) {
    renewCredentials(session);
    await dispatch(checkRoute(session));
    restartIfRelay(session);
  }
};

// Keeps an eye on every open connection, once a minute (started when the first one opens).
export const watchPaths = (): AppThunk => (dispatch) => {
  timer ??= window.setInterval(() => void check(dispatch), PATH_CHECK_MS);
};
