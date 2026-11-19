import { getPeer } from '../../webrtc/getPeer.ts';
import { connecting } from '../connection/connectionSlice.ts';
import type { AppThunk } from '../store.ts';

// Host side: applies the client's reply. The chat opens when the data channel does.
export const connect = (answer: RTCSessionDescriptionInit): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(connecting());
  await getPeer(dispatch).setRemoteDescription(answer);
};
