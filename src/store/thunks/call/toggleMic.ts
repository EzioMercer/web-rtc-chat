import { setTracksEnabled } from '../../../core/webrtc/setTracksEnabled.ts';
import { micToggled } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { sendCallState } from './sendCallState.ts';

export const toggleMic = (): AppThunk => (dispatch, getState) => {
  dispatch(micToggled());
  setTracksEnabled('audio', getState().call.mic);
  dispatch(sendCallState());
};
