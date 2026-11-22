import { historySaver } from '../../../core/history/historySaver.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { closeSession } from '../../../core/webrtc/closeSession.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { pausedChanged } from '../../app/appSlice.ts';
import { sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from '../call/endCall.ts';
import { startOver } from '../manual/startOver.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';
import { CallStatus } from '../../call/types.ts';
import { SessionStatus } from '../../sessions/types.ts';

// Goes offline for a backup, so nothing changes while it is made or restored: ends the call and every connection
// (files on their way stop), stops listening on relays and blocks new connections until goOnline. Then saves what
// is still waiting to be saved.
export const goOffline = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  dispatch(pausedChanged(true));

  if (getState().call.status !== CallStatus.Idle) {
    dispatch(endCall('Call ended for a backup.'));
  }

  if (sessions.has(MANUAL_KEY)) {
    dispatch(startOver());
  }

  [...sessions.values()].forEach((session) => {
    closeSession(session);
    dispatch(sessionStatusChanged({ key: session.key, status: SessionStatus.Idle }));
  });

  await dispatch(refreshMailboxes());
  await historySaver.flush();
};
