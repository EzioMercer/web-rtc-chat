import { rtc } from '../../webrtc/state.ts';
import { addMessage } from '../chat/chatSlice.ts';
import type { AppThunk } from '../store.ts';

// Sends `text` to the peer and adds it to the chat. Returns whether it was sent.
export const sendMessage = (text: string): AppThunk<boolean> => (dispatch) => {
  const { channel } = rtc;
  const trimmed = text.trim();

  if (!trimmed || channel?.readyState !== 'open') {
    return false;
  }

  channel.send(trimmed);
  dispatch(addMessage({ from: 'me', text: trimmed }));

  return true;
};
