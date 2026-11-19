import { attachLocalTracks } from '../../../webrtc/attachLocalTracks.ts';
import { sendControl } from '../../../webrtc/sendControl.ts';
import type { CallSignal } from '../../../webrtc/types.ts';
import { callActive, callStarted, remoteMediaChanged } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { sendCallState } from './sendCallState.ts';

// Reacts to call control messages from the peer.
export const receiveCallSignal = (signal: CallSignal): AppThunk => (dispatch, getState) => {
  const { status } = getState().call;

  switch (signal.action) {
    case 'invite':
      // Already in (or setting up) a call: report busy.
      if (status !== 'idle') {
        sendControl({ t: 'call', action: 'decline' });

        return;
      }

      dispatch(callStarted({ status: 'incoming', video: signal.video }));
      break;
    case 'accept':
      if (status === 'outgoing') {
        attachLocalTracks();
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
      dispatch(remoteMediaChanged({ mic: signal.mic, cam: signal.cam }));
      break;
  }
};
