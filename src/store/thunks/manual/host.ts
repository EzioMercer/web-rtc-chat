import { bindChannel } from '../../../webrtc/bindChannel.ts';
import { CONTROL_LABEL, MANUAL_KEY } from '../../../webrtc/config.ts';
import { createLocalCode } from '../../../webrtc/createLocalCode.ts';
import { createSession } from '../../../webrtc/createSession.ts';
import { codeGenerated, generationStarted } from '../../manual/manualSlice.ts';
import type { AppThunk } from '../../store.ts';

// Host side: opens the chat channel and produces the invite (offer) code.
export const host = (): AppThunk<Promise<void>> => async (dispatch) => {
  const session = createSession({ key: MANUAL_KEY, sid: MANUAL_KEY, outgoing: true, polite: false }, dispatch);

  dispatch(generationStarted());
  bindChannel(session, session.peer.createDataChannel(CONTROL_LABEL), dispatch);
  await session.peer.setLocalDescription(await session.peer.createOffer());
  dispatch(codeGenerated({ role: 'host', code: await createLocalCode(session.peer) }));
};
