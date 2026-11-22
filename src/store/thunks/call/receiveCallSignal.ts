import { attachLocalTracks } from '../../../core/webrtc/attachLocalTracks.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { type CallSignal, CallAction, ControlType } from '../../../core/webrtc/types.ts';
import { echoGuardFor } from '../../../features/calls/echoGuardFor.ts';
import { callActive, callStarted, echoReported, remoteMediaChanged } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { sendCallState } from './sendCallState.ts';
import { CallStatus } from '../../call/types.ts';

// Reacts to call control messages from the peer of conversation `key`.
export const receiveCallSignal = (key: string, signal: CallSignal): AppThunk => (dispatch, getState) => {
  const { status, key: callKey } = getState().call;

  // Already in (or setting up) a call: report busy.
  if (signal.action === CallAction.Invite) {
    if (status !== CallStatus.Idle) {
      sendControl(key, { t: ControlType.Call, action: CallAction.Decline });

      return;
    }

    const echoGuard = echoGuardFor(getState().settings.echoGuard);

    dispatch(callStarted({ key, status: CallStatus.Incoming, video: signal.video, echoGuard }));

    return;
  }

  // Everything else is about the current call.
  if (callKey !== key) {
    return;
  }

  switch (signal.action) {
    case CallAction.Accept:
      if (status === CallStatus.Outgoing) {
        attachLocalTracks(key);
        dispatch(callActive());
        dispatch(sendCallState());
      }

      break;
    case CallAction.Decline:
      if (status === CallStatus.Outgoing) {
        dispatch(endCall('Call declined.'));
      }

      break;
    case CallAction.End:
      dispatch(endCall(status === CallStatus.Incoming ? 'Missed call.' : 'Call ended.'));
      break;
    case CallAction.State:
      dispatch(remoteMediaChanged({ mic: signal.mic, cam: signal.cam, screen: signal.screen === true }));
      break;
    case CallAction.Echo:
      dispatch(echoReported());
      break;
  }
};
