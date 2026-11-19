import { connectionFailed } from '../../manual/manualSlice.ts';
import type { AppThunk } from '../../store.ts';

// The host applied the reply and still no path works: say so, but keep the connection, which may still come up.
// On the joining side this is expected while the host hasn't pasted the reply yet, so nothing is shown.
export const manualPathFailed = (): AppThunk => (dispatch, getState) => {
  const { role, status } = getState().manual;

  if (role === 'host' && status === 'connecting') {
    dispatch(connectionFailed());
  }
};
