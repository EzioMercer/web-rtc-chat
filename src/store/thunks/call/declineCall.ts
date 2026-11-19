import { sendControl } from '../../../webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';

export const declineCall = (): AppThunk => (dispatch, getState) => {
  const { key } = getState().call;

  if (key) {
    sendControl(key, { t: 'call', action: 'decline' });
  }

  dispatch(endCall('Call declined.'));
};
