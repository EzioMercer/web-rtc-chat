import { sendControl } from '../../../webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';

// Ends an active call, or cancels one that is still ringing.
export const hangUp = (): AppThunk => (dispatch, getState) => {
  const { status, key } = getState().call;

  if (key) {
    sendControl(key, { t: 'call', action: 'end' });
  }

  dispatch(endCall(status === 'active' ? 'Call ended.' : 'Call cancelled.'));
};
