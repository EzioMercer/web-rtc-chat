import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { closeSession } from '../../../core/webrtc/closeSession.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { manualReset } from '../../manual/manualSlice.ts';
import type { AppThunk } from '../../store.ts';
import { endCall } from '../call/endCall.ts';
import { clearConversation } from '../chat/clearConversation.ts';

// Closes the manual connection and clears its conversation.
export const startOver = (): AppThunk => (dispatch, getState) => {
  const session = sessions.get(MANUAL_KEY);

  if (getState().call.key === MANUAL_KEY) {
    dispatch(endCall('Call ended.'));
  }

  if (session) {
    closeSession(session);
  }

  dispatch(clearConversation(MANUAL_KEY));
  dispatch(manualReset());
};
