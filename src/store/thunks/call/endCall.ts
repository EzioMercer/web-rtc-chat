import { releaseMedia } from '../../../core/webrtc/releaseMedia.ts';
import { callEnded } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';

// Tears the call down on this side and notes `reason` in the conversation.
export const endCall = (reason: string): AppThunk => (dispatch, getState) => {
  const { status, key } = getState().call;

  if (status === 'idle') {
    return;
  }

  releaseMedia(key);
  dispatch(callEnded());

  if (key) {
    dispatch(addMessage({ key, from: 'system', text: reason }));
  }
};
