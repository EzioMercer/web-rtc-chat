import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { messageMovedToEnd } from '../../chat/chatSlice.ts';
import { MessageAuthor } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';
import { sendPending } from './sendPending.ts';

// "Send again" for ours given up on (see RESEND_MS) or failed: it moves to the end, as written now, and goes like a
// new one (now, or when the connection opens). If it had arrived after all, they keep it where it was.
export const sendAgain = (key: string, id: string): AppThunk => (dispatch, getState) => {
  const message = getState().chat.conversations[key]?.find(m => m.id === id);

  if (message?.from !== MessageAuthor.Me) {
    return;
  }

  dispatch(messageMovedToEnd({ key, id }));

  if (sessions.get(key)?.channel?.readyState === 'open') {
    dispatch(sendPending(key));
  } else if (key !== MANUAL_KEY) {
    void dispatch(connectContact(key));
  }
};
