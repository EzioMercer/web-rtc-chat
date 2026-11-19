import { sendControl } from '../../webrtc/sendControl.ts';
import { addMessage } from '../chat/chatSlice.ts';
import type { AppThunk } from '../store.ts';

// Sends `text` to the peer and adds it to the chat. Returns whether it was sent.
export const sendMessage = (text: string): AppThunk<boolean> => (dispatch) => {
  const trimmed = text.trim();

  if (!trimmed || !sendControl({ t: 'text', text: trimmed })) {
    return false;
  }

  dispatch(addMessage({ from: 'me', text: trimmed }));

  return true;
};
