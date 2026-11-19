import { MANUAL_KEY } from '../../../webrtc/config.ts';
import { createLocalCode } from '../../../webrtc/createLocalCode.ts';
import { createSession } from '../../../webrtc/createSession.ts';
import { codeGenerated, generationStarted } from '../../manual/manualSlice.ts';
import type { AppThunk } from '../../store.ts';

// Client side: accepts the host's invite and produces the reply (answer) code.
// The client is the polite side: it yields when both peers renegotiate at the same time.
export const join = (offer: RTCSessionDescriptionInit): AppThunk<Promise<void>> => async (dispatch) => {
  const { peer } = createSession({ key: MANUAL_KEY, sid: MANUAL_KEY, outgoing: false, polite: true }, dispatch);

  dispatch(generationStarted());
  await peer.setRemoteDescription(offer);
  await peer.setLocalDescription(await peer.createAnswer());
  dispatch(codeGenerated({ role: 'client', code: await createLocalCode(peer) }));
};
