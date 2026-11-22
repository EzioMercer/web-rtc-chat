import { sendControl } from '../../../core/webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { ControlType, CallAction } from '../../../core/webrtc/types.ts';
import { CallStatus } from '../../call/types.ts';

// Ends an active call, or cancels one that is still ringing.
export const hangUp = (): AppThunk => (dispatch, getState) => {
  const { status, key } = getState().call;

  if (key) {
    sendControl(key, { t: ControlType.Call, action: CallAction.End });
  }

  dispatch(endCall(status === CallStatus.Active ? 'Call ended.' : 'Call cancelled.'));
};
