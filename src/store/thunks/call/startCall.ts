import { getLocalMedia } from '../../../core/webrtc/getLocalMedia.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { media } from '../../../core/webrtc/state.ts';
import { callStarted } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { echoGuardFor } from '../../../features/calls/echoGuardFor.ts';

// Rings the peer. Local media is captured now for the preview, but only sent once the peer accepts.
export const startCall = (key: string, video: boolean): AppThunk<Promise<void>> => async (dispatch, getState) => {
  if (getState().call.status !== 'idle') {
    return;
  }

  try {
    media.localStream = await getLocalMedia(video);
  } catch {
    dispatch(addMessage({ key, from: 'system', text: 'Could not access your microphone or camera.' }));

    return;
  }

  dispatch(callStarted({ key, status: 'outgoing', video, echoGuard: echoGuardFor(getState().settings.echoGuard) }));
  sendControl(key, { t: 'call', action: 'invite', video });
};
