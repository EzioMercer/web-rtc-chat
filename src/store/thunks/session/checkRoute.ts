import { getRoute } from '../../../webrtc/getRoute.ts';
import { tuneSenders } from '../../../webrtc/tuneSenders.ts';
import type { Session } from '../../../webrtc/types.ts';
import { sessionRouteChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';

// Finds out which path the open connection uses now, and shows it when it changed.
export const checkRoute = (session: Session): AppThunk<Promise<void>> => async (dispatch) => {
  const route = await getRoute(session.peer).catch(() => session.route ?? 'direct');

  if (route === session.route || session.peer.connectionState === 'closed') {
    return;
  }

  const first = session.route === null;

  session.route = route;

  if (route === 'relay') {
    session.log(first ? 'Connected through the TURN relay.' : 'Moved to the TURN relay.');
  } else {
    session.log(first ? 'Connected directly.' : 'Moved to a direct connection.');
  }

  dispatch(sessionRouteChanged({ key: session.key, route }));
  await tuneSenders(session);
};
