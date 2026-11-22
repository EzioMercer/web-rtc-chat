import { sendControl } from '../../../core/webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { ControlType, CallAction } from '../../../core/webrtc/types.ts';

export const declineCall = (): AppThunk => (dispatch, getState) => {
  const { key } = getState().call;

  if (key) {
    sendControl(key, { t: ControlType.Call, action: CallAction.Decline });
  }

  dispatch(endCall('Call declined.'));
};
