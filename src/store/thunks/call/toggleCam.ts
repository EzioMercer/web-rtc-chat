import { setTracksEnabled } from '../../../core/webrtc/setTracksEnabled.ts';
import { camToggled } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { sendCallState } from './sendCallState.ts';
import { TrackKind } from '../../../core/webrtc/TrackKind.ts';

export const toggleCam = (): AppThunk => (dispatch, getState) => {
  dispatch(camToggled());
  setTracksEnabled(TrackKind.Video, getState().call.cam);
  dispatch(sendCallState());
};
