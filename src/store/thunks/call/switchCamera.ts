import { isRearCamera } from '../../../core/webrtc/isRearCamera.ts';
import { openNextCamera } from '../../../core/webrtc/openNextCamera.ts';
import { replaceCamera } from '../../../core/webrtc/replaceCamera.ts';
import { media, sessions } from '../../../core/webrtc/state.ts';
import { cameraChanged } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { toggleCam } from './toggleCam.ts';
import { CallStatus } from '../../call/types.ts';
import { MessageAuthor } from '../../chat/types.ts';

let switching = false;

// Sends our next camera instead of the current one (e.g. a phone's back camera instead of its front one).
export const switchCamera = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { key, status } = getState().call;
  const session = key ? sessions.get(key) : undefined;
  const was = media.localStream?.getVideoTracks()[0];

  if (switching || !key || !session || !was || status !== CallStatus.Active) {
    return;
  }

  switching = true;

  let now: MediaStreamTrack;

  try {
    now = await openNextCamera(was);
  } catch {
    // No camera works now: show it as off. Turning it on tries again (see startCamera).
    dispatch(addMessage({ key, from: MessageAuthor.System, text: 'Could not switch the camera.' }));
    dispatch(toggleCam());

    return;
  } finally {
    switching = false;
  }

  // The call ended while the camera opened.
  if (getState().call.key !== key || media.localStream?.getVideoTracks()[0] !== was) {
    now.stop();

    return;
  }

  await replaceCamera(session, was, now).catch(() => undefined);
  session.log('Switched to another camera');
  dispatch(cameraChanged({ rear: isRearCamera(now) }));
};
