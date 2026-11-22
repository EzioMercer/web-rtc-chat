import { attachLocalTracks } from '../../../core/webrtc/attachLocalTracks.ts';
import { getLocalMedia } from '../../../core/webrtc/getLocalMedia.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { media, sessions } from '../../../core/webrtc/state.ts';
import { answeredWithAudioOnly, callActive } from '../../call/callSlice.ts';

import type { AppThunk } from '../../store.ts';
import { endCall } from './endCall.ts';
import { sendCallState } from './sendCallState.ts';

// If the caller's offer doesn't arrive within this time after accepting, send our tracks with our own offer.
const ATTACH_FALLBACK_MS = 4000;

// Answers the incoming call. `audioOnly` answers a video call without our camera (we still see theirs).
export const acceptCall = (audioOnly = false): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { status, video, key } = getState().call;

  if (status !== 'incoming' || !key) {
    return;
  }

  try {
    media.localStream = await getLocalMedia(video && !audioOnly);
  } catch {
    sendControl(key, { t: 'call', action: 'decline' });
    dispatch(endCall('Could not access your microphone or camera.'));

    return;
  }

  if (video && audioOnly) {
    dispatch(answeredWithAudioOnly());
  }

  const session = sessions.get(key);

  // The caller adds its tracks when it gets "accept" and offers; ours go into the answer. If no offer comes
  // (e.g. an older version on their side), add ours the usual way.
  if (session) {
    session.attachOnOffer = true;
    window.setTimeout(() => {
      if (session.attachOnOffer && sessions.get(key) === session) {
        session.attachOnOffer = false;
        attachLocalTracks(key);
      }
    }, ATTACH_FALLBACK_MS);
  }

  dispatch(callActive());
  sendControl(key, { t: 'call', action: 'accept' });
  dispatch(sendCallState());
};
