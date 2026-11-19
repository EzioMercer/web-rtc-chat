import { createLocalCode } from '../../webrtc/createLocalCode.ts';
import { getPeer } from '../../webrtc/getPeer.ts';
import { rtc } from '../../webrtc/state.ts';
import { codeGenerated, generationStarted } from '../connection/connectionSlice.ts';
import type { AppThunk } from '../store.ts';

// Client side: accepts the host's invite and produces the reply (answer) code.
export const join = (offer: RTCSessionDescriptionInit): AppThunk<Promise<void>> => async (dispatch) => {
  const peer = getPeer(dispatch);

  // The client yields when both peers renegotiate at the same time.
  rtc.polite = true;
  dispatch(generationStarted());
  await peer.setRemoteDescription(offer);
  await peer.setLocalDescription(await peer.createAnswer());
  dispatch(codeGenerated({ role: 'client', code: await createLocalCode(peer) }));
};
