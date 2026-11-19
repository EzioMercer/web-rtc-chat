import { releaseMedia } from '../../../webrtc/releaseMedia.ts';
import { callEnded } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';

// Tears the call down on this side and notes `reason` in the chat.
export const endCall = (reason: string): AppThunk => (dispatch, getState) => {
  if (getState().call.status === 'idle') {
    return;
  }

  releaseMedia();
  dispatch(callEnded());
  dispatch(addMessage({ from: 'system', text: reason }));
};
