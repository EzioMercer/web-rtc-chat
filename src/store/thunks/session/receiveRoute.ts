import { sessions } from '../../../core/webrtc/state.ts';
import type { AppThunk } from '../../store.ts';
import { checkRoute } from './checkRoute.ts';

// They told us whether their end of the path is the TURN relay (see checkRoute).
export const receiveRoute = (key: string, relay: boolean): AppThunk<Promise<void>> => async (dispatch) => {
  const session = sessions.get(key);

  if (!session || session.theirRelay === relay) {
    return;
  }

  session.theirRelay = relay;
  await dispatch(checkRoute(session));
};
