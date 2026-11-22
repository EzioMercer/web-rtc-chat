import { setTracksEnabled } from '../../../core/webrtc/setTracksEnabled.ts';
import { camToggled } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { sendCallState } from './sendCallState.ts';

export const toggleCam = (): AppThunk => (dispatch, getState) => {
  dispatch(camToggled());
  setTracksEnabled('video', getState().call.cam);
  dispatch(sendCallState());
};
