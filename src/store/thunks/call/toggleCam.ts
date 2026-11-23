import { setTracksEnabled } from '../../../core/webrtc/setTracksEnabled.ts';
import { media } from '../../../core/webrtc/state.ts';
import { camToggled } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { sendCallState } from './sendCallState.ts';
import { startCamera } from './startCamera.ts';
import { TrackKind } from '../../../core/webrtc/TrackKind.ts';

export const toggleCam = (): AppThunk => (dispatch, getState) => {
  // Turning it on with no working camera (answered with audio only, or it failed): open one.
  if (!getState().call.cam && media.localStream?.getVideoTracks()[0]?.readyState !== 'live') {
    void dispatch(startCamera());

    return;
  }

  dispatch(camToggled());
  setTracksEnabled(TrackKind.Video, getState().call.cam);
  dispatch(sendCallState());
};
