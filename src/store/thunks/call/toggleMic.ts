import { setTracksEnabled } from '../../../core/webrtc/setTracksEnabled.ts';
import { micToggled } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { sendCallState } from './sendCallState.ts';
import { TrackKind } from '../../../core/webrtc/TrackKind.ts';

export const toggleMic = (): AppThunk => (dispatch, getState) => {
  dispatch(micToggled());
  setTracksEnabled(TrackKind.Audio, getState().call.mic);
  dispatch(sendCallState());
};
