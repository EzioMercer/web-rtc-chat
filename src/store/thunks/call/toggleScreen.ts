import { media, sessions } from '../../../webrtc/state.ts';
import { screenChanged } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { sendCallState } from './sendCallState.ts';

// Phones' browsers can't share the screen; the button is shown only where this is true.
export const canShareScreen = () => typeof navigator.mediaDevices?.getDisplayMedia === 'function';

const stopScreen = (): AppThunk => (dispatch) => {
  const { screen } = media;

  if (!screen) {
    return;
  }

  media.screen = null;
  // Back to what the sender sent before: our camera, or nothing.
  void screen.sender.replaceTrack(screen.before).catch(() => undefined);
  screen.stream.getTracks().forEach(track => track.stop());
  dispatch(screenChanged(false));
  dispatch(sendCallState());
};

// Starts or stops sharing our screen in the current call. It goes out instead of our camera (no new offer
// needed); in an audio call it is added as a new video track.
export const toggleScreen = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { key, status } = getState().call;

  if (media.screen) {
    dispatch(stopScreen());

    return;
  }

  if (status !== 'active' || !key) {
    return;
  }

  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch {
    // Cancelled in the browser's picker, or not allowed.
    return;
  }

  const [track] = stream.getVideoTracks();
  const session = sessions.get(key);

  // The call ended or the connection changed while the picker was open.
  if (!track || !session || getState().call.status !== 'active' || getState().call.key !== key) {
    stream.getTracks().forEach(t => t.stop());

    return;
  }

  try {
    // Prefer the camera's sender (no new offer needed). In an audio call, reuse this call's earlier screen
    // sender, or add one (a new offer). Slots from earlier calls aren't reused: their side wouldn't notice them.
    const camera = session.senders.find(s => s.track?.kind === 'video');
    const sender = camera ?? session.screenSender ?? session.peer.addTrack(track, media.localStream ?? stream);
    const before = camera?.track ?? null;

    if (sender.track !== track) {
      await sender.replaceTrack(track);
    }

    if (!camera && !session.screenSender) {
      session.screenSender = sender;
      session.senders.push(sender);
    }

    media.screen = { stream, sender, before };
  } catch {
    stream.getTracks().forEach(t => t.stop());
    dispatch(addMessage({ key, from: 'system', text: 'Could not share your screen.' }));

    return;
  }

  session.log('Sharing our screen');
  // Stopped from the browser's own "Stop sharing" button.
  track.onended = () => dispatch(stopScreen());
  dispatch(screenChanged(true));
  dispatch(sendCallState());
};
