import { getLocalMedia } from '../../../core/webrtc/getLocalMedia.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { media, sessions } from '../../../core/webrtc/state.ts';
import { answeredWithAudioOnly, callActive } from '../../call/callSlice.ts';

import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { sendCallState } from './sendCallState.ts';
import { CallStatus } from '../../call/types.ts';
import { ControlType, CallAction } from '../../../core/webrtc/types.ts';

// Answers the incoming call. `audioOnly` answers a video call without our camera (we still see theirs).
export const acceptCall = (audioOnly = false): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { status, video, key } = getState().call;

  if (status !== CallStatus.Incoming || !key) {
    return;
  }

  try {
    media.localStream = await getLocalMedia(video && !audioOnly);
  } catch {
    sendControl(key, { t: ControlType.Call, action: CallAction.Decline });
    dispatch(endCall('Could not access your microphone or camera.'));

    return;
  }

  if (video && audioOnly) {
    dispatch(answeredWithAudioOnly());
  }

  const session = sessions.get(key);

  // The caller adds its tracks when it gets "accept" and offers; ours go into the answer.
  if (session) {
    session.attachOnOffer = true;
  }

  dispatch(callActive());
  sendControl(key, { t: ControlType.Call, action: CallAction.Accept });
  dispatch(sendCallState());
};
