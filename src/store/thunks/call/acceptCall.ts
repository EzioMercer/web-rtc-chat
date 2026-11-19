import { attachLocalTracks } from '../../../webrtc/attachLocalTracks.ts';
import { getLocalMedia } from '../../../webrtc/getLocalMedia.ts';
import { sendControl } from '../../../webrtc/sendControl.ts';
import { rtc } from '../../../webrtc/state.ts';
import { callActive } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { sendCallState } from './sendCallState.ts';

export const acceptCall = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { status, video } = getState().call;

  if (status !== 'incoming') {
    return;
  }

  try {
    rtc.localStream = await getLocalMedia(video);
  } catch {
    sendControl({ t: 'call', action: 'decline' });
    dispatch(endCall('Could not access your microphone or camera.'));

    return;
  }

  attachLocalTracks();
  dispatch(callActive());
  sendControl({ t: 'call', action: 'accept' });
  dispatch(sendCallState());
};
