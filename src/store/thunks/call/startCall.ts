import { getLocalMedia } from '../../../core/webrtc/getLocalMedia.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { media } from '../../../core/webrtc/state.ts';
import { callStarted } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { echoGuardFor } from '../../../features/calls/echoGuardFor.ts';
import { CallStatus } from '../../call/types.ts';
import { ControlType, CallAction } from '../../../core/webrtc/types.ts';
import { MessageAuthor } from '../../chat/types.ts';

// Rings the peer. Local media is captured now for the preview, but only sent once the peer accepts.
export const startCall = (key: string, video: boolean): AppThunk<Promise<void>> => async (dispatch, getState) => {
  if (getState().call.status !== CallStatus.Idle) {
    return;
  }

  try {
    media.localStream = await getLocalMedia(video);
  } catch {
    dispatch(addMessage({ key, from: MessageAuthor.System, text: 'Could not access your microphone or camera.' }));

    return;
  }

  const echoGuard = echoGuardFor(getState().settings.echoGuard);

  dispatch(callStarted({ key, status: CallStatus.Outgoing, video, echoGuard }));
  sendControl(key, { t: ControlType.Call, action: CallAction.Invite, video });
};
