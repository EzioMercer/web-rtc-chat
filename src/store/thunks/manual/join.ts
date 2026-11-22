import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { createLocalCode } from '../../../core/webrtc/createLocalCode.ts';
import { createSession } from '../../../core/webrtc/createSession.ts';
import { ensureTurnServers } from '../../../core/webrtc/turnServers.ts';
import { codeGenerated, generationStarted } from '../../manual/manualSlice.ts';
import type { AppThunk } from '../../store.ts';
import { ManualRole } from '../../manual/types.ts';

// Client side: accepts the host's invite and produces the reply (answer) code.
// The client is the polite side: it yields when both peers renegotiate at the same time.
export const join = (offer: RTCSessionDescriptionInit): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(generationStarted());
  await ensureTurnServers();

  const { peer } = createSession({ key: MANUAL_KEY, sid: MANUAL_KEY, outgoing: false, polite: true }, dispatch);

  await peer.setRemoteDescription(offer);
  await peer.setLocalDescription(await peer.createAnswer());
  dispatch(codeGenerated({ role: ManualRole.Client, code: await createLocalCode(peer) }));
};
