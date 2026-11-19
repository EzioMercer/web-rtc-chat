import { sendControl } from '../../../webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';

export const declineCall = (): AppThunk => (dispatch) => {
  sendControl({ t: 'call', action: 'decline' });
  dispatch(endCall('Call declined.'));
};
