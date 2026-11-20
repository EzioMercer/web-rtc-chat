import { attachLocalTracks } from '../../../webrtc/attachLocalTracks.ts';
import { sendControl } from '../../../webrtc/sendControl.ts';
import type { CallSignal } from '../../../webrtc/types.ts';
import { callActive, callStarted, remoteMediaChanged } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { sendCallState } from './sendCallState.ts';

// Reacts to call control messages from the peer of conversation `key`.
export const receiveCallSignal = (key: string, signal: CallSignal): AppThunk => (dispatch, getState) => {
  const { status, key: callKey } = getState().call;

  // Already in (or setting up) a call: report busy.
  if (signal.action === 'invite') {
    if (status !== 'idle') {
      sendControl(key, { t: 'call', action: 'decline' });

      return;
    }

    dispatch(callStarted({ key, status: 'incoming', video: signal.video }));

    return;
  }

  // Everything else is about the current call.
  if (callKey !== key) {
    return;
  }

  switch (signal.action) {
    case 'accept':
      if (status === 'outgoing') {
        attachLocalTracks(key);
        dispatch(callActive());
        dispatch(sendCallState());
      }

      break;
    case 'decline':
      if (status === 'outgoing') {
        dispatch(endCall('Call declined.'));
      }

      break;
    case 'end':
      dispatch(endCall(status === 'incoming' ? 'Missed call.' : 'Call ended.'));
      break;
    case 'state':
      dispatch(remoteMediaChanged({ mic: signal.mic, cam: signal.cam, screen: signal.screen === true }));
      break;
  }
};
