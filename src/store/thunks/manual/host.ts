import { bindChannel } from '../../../core/webrtc/bindChannel.ts';
import { CONTROL_LABEL, MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { createLocalCode } from '../../../core/webrtc/createLocalCode.ts';
import { createSession } from '../../../core/webrtc/createSession.ts';
import { ensureTurnServers } from '../../../core/webrtc/turnServers.ts';
import { codeGenerated, generationStarted } from '../../manual/manualSlice.ts';
import type { AppThunk } from '../../store.ts';
import { ManualRole } from '../../manual/types.ts';

// Host side: opens the chat channel and produces the invite (offer) code.
export const host = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(generationStarted());
  await ensureTurnServers();

  const session = createSession({ key: MANUAL_KEY, sid: MANUAL_KEY, outgoing: true, polite: false }, dispatch);

  bindChannel(session, session.peer.createDataChannel(CONTROL_LABEL), dispatch);
  await session.peer.setLocalDescription(await session.peer.createOffer());
  dispatch(codeGenerated({ role: ManualRole.Host, code: await createLocalCode(session.peer) }));
};
