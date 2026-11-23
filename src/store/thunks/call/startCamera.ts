import { getCamera } from '../../../core/webrtc/getCamera.ts';
import { isRearCamera } from '../../../core/webrtc/isRearCamera.ts';
import { replaceCamera } from '../../../core/webrtc/replaceCamera.ts';
import { senderKind } from '../../../core/webrtc/senderKind.ts';
import { media, sessions } from '../../../core/webrtc/state.ts';
import { TrackKind } from '../../../core/webrtc/TrackKind.ts';
import { cameraChanged } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { sendCallState } from './sendCallState.ts';
import { CallStatus } from '../../call/types.ts';
import { MessageAuthor } from '../../chat/types.ts';

// Opens our camera in a call that has none working (answered with audio only, or the camera failed) and sends it.
export const startCamera = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { key, status } = getState().call;
  const session = key ? sessions.get(key) : undefined;
  const stream = media.localStream;
  const was = stream?.getVideoTracks()[0];

  if (!key || !session || !stream || status !== CallStatus.Active) {
    return;
  }

  let track: MediaStreamTrack;

  try {
    track = await getCamera();
  } catch {
    dispatch(addMessage({ key, from: MessageAuthor.System, text: 'Could not turn on your camera.' }));

    return;
  }

  // The call ended, or another press already opened a camera.
  if (getState().call.key !== key || media.localStream !== stream || stream.getVideoTracks()[0] !== was) {
    track.stop();

    return;
  }

  try {
    if (was) {
      // A camera that stopped working: the new one goes where it went.
      await replaceCamera(session, was, track);
    } else {
      stream.addTrack(track);

      // A video slot this call already has (a screen shared earlier, which may still be on), or a new one (this
      // sends a new offer).
      const slot = session.senders.find(s => senderKind(session.peer, s) === TrackKind.Video);

      if (media.screen && media.screen.sender === slot) {
        media.screen.before = track;
      } else if (slot) {
        await slot.replaceTrack(track);
      } else {
        session.senders.push(session.peer.addTrack(track, stream));
      }
    }
  } catch {
    track.stop();
    stream.removeTrack(track);
    dispatch(addMessage({ key, from: MessageAuthor.System, text: 'Could not turn on your camera.' }));

    return;
  }

  session.log('Sending our camera');
  dispatch(cameraChanged({ rear: isRearCamera(track) }));
  dispatch(sendCallState());
};
