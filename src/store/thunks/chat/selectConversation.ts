import { conversationRead } from '../../chat/chatSlice.ts';
import { conversationSelected } from '../../ui/uiSlice.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';

// Opens a conversation (or closes it, with null). Opening a contact checks whether they are online, by trying to
// connect: that is the only time we "ask", nothing is published otherwise.
export const selectConversation = (key: string | null): AppThunk => (dispatch, getState) => {
  dispatch(conversationSelected(key));

  if (!key) {
    return;
  }

  dispatch(conversationRead(key));

  if (getState().contacts.list.some(c => c.id === key)) {
    void dispatch(connectContact(key));
  }
};
