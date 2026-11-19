import { getLocalMedia } from '../../../webrtc/getLocalMedia.ts';
import { sendControl } from '../../../webrtc/sendControl.ts';
import { rtc } from '../../../webrtc/state.ts';
import { callStarted } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';

// Rings the peer. Local media is captured now for the preview, but only sent once the peer accepts.
export const startCall = (video: boolean): AppThunk<Promise<void>> => async (dispatch, getState) => {
  if (getState().call.status !== 'idle') {
    return;
  }

  try {
    rtc.localStream = await getLocalMedia(video);
  } catch {
    dispatch(addMessage({ from: 'system', text: 'Could not access your microphone or camera.' }));

    return;
  }

  dispatch(callStarted({ status: 'outgoing', video }));
  sendControl({ t: 'call', action: 'invite', video });
};
