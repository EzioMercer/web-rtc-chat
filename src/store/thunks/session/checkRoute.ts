import { getPathEnds } from '../../../core/webrtc/getPathEnds.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { tuneSenders } from '../../../core/webrtc/tuneSenders.ts';
import { ControlType, type Session } from '../../../core/webrtc/types.ts';
import { sessionRouteChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { SessionRoute } from '../../sessions/types.ts';

// Finds out which path the open connection uses now, and shows it when it changed. It goes through the TURN relay
// if either end is the relay. We know our end, but their relay address can look like an ordinary one to us (when
// their checks arrive before the address itself, it is a "prflx" address), so each side tells the other about its
// own end.
export const checkRoute = (session: Session): AppThunk<Promise<void>> => async (dispatch) => {
  const ends = await getPathEnds(session.peer).catch(() => null);

  if (session.peer.connectionState === 'closed') {
    return;
  }

  if (ends) {
    const relay = ends.ours === 'relay';

    if (relay !== session.ourRelay && sendControl(session.key, { t: ControlType.Route, relay })) {
      session.ourRelay = relay;
    }
  }

  const relay = session.theirRelay || ends?.ours === 'relay' || ends?.theirs === 'relay';
  let route = relay ? SessionRoute.Relay : SessionRoute.Direct;

  // No path chosen at the moment (e.g. during a path search): keep what we had.
  if (!ends && !relay) {
    route = session.route ?? SessionRoute.Direct;
  }

  if (route === session.route) {
    return;
  }

  const first = session.route === null;
  const path = ends ? ` (our end: ${ends.ours}, theirs: ${ends.theirs}${session.theirRelay ? ', the relay' : ''})` : '';

  session.route = route;

  if (route === SessionRoute.Relay) {
    session.log(`${first ? 'Connected through the TURN relay' : 'Moved to the TURN relay'}${path}.`);
  } else {
    session.log(`${first ? 'Connected directly' : 'Moved to a direct connection'}${path}.`);
  }

  dispatch(sessionRouteChanged({ key: session.key, route }));
  await tuneSenders(session);
};
