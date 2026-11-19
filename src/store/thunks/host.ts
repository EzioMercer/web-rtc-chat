import { CHANNEL_LABEL } from '../../webrtc/config.ts';
import { bindChannel } from '../../webrtc/bindChannel.ts';
import { createLocalCode } from '../../webrtc/createLocalCode.ts';
import { getPeer } from '../../webrtc/getPeer.ts';
import { codeGenerated, generationStarted } from '../connection/connectionSlice.ts';
import type { AppThunk } from '../store.ts';

// Host side: opens the chat channel and produces the invite (offer) code.
export const host = (): AppThunk<Promise<void>> => async (dispatch) => {
  const peer = getPeer(dispatch);

  dispatch(generationStarted());
  bindChannel(peer.createDataChannel(CHANNEL_LABEL), dispatch);
  await peer.setLocalDescription(await peer.createOffer());
  dispatch(codeGenerated({ role: 'host', code: await createLocalCode(peer) }));
};
