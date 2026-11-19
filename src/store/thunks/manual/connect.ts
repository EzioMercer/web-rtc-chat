import { sessions } from '../../../webrtc/state.ts';
import { MANUAL_KEY } from '../../../webrtc/config.ts';
import { connecting } from '../../manual/manualSlice.ts';
import type { AppThunk } from '../../store.ts';

// Host side: applies the client's reply. The chat opens when the data channel does.
export const connect = (answer: RTCSessionDescriptionInit): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(connecting());
  await sessions.get(MANUAL_KEY)?.peer.setRemoteDescription(answer);
};
