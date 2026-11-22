import { releaseMedia } from '../../../core/webrtc/releaseMedia.ts';
import { callEnded } from '../../call/callSlice.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { CallStatus } from '../../call/types.ts';
import { MessageAuthor } from '../../chat/types.ts';

// Tears the call down on this side and notes `reason` in the conversation.
export const endCall = (reason: string): AppThunk => (dispatch, getState) => {
  const { status, key } = getState().call;

  if (status === CallStatus.Idle) {
    return;
  }

  releaseMedia(key);
  dispatch(callEnded());

  if (key) {
    dispatch(addMessage({ key, from: MessageAuthor.System, text: reason }));
  }
};
