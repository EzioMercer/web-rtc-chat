import { sendControl } from '../../../webrtc/sendControl.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';

// Sends `text` over the direct connection and adds it to the conversation. Returns whether it was sent.
export const sendMessage = (key: string, text: string): AppThunk<boolean> => (dispatch) => {
  const trimmed = text.trim();

  if (!trimmed || !sendControl(key, { t: 'text', text: trimmed })) {
    return false;
  }

  dispatch(addMessage({ key, from: 'me', text: trimmed }));

  return true;
};
