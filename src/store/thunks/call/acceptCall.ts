import { attachLocalTracks } from '../../../webrtc/attachLocalTracks.ts';
import { getLocalMedia } from '../../../webrtc/getLocalMedia.ts';
import { sendControl } from '../../../webrtc/sendControl.ts';
import { media } from '../../../webrtc/state.ts';
import { callActive } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { sendCallState } from './sendCallState.ts';

export const acceptCall = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { status, video, key } = getState().call;

  if (status !== 'incoming' || !key) {
    return;
  }

  try {
    media.localStream = await getLocalMedia(video);
  } catch {
    sendControl(key, { t: 'call', action: 'decline' });
    dispatch(endCall('Could not access your microphone or camera.'));

    return;
  }

  attachLocalTracks(key);
  dispatch(callActive());
  sendControl(key, { t: 'call', action: 'accept' });
  dispatch(sendCallState());
};
