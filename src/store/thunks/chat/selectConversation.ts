import { conversationRead } from '../../chat/chatSlice.ts';
import { conversationSelected, unreadLineSet } from '../../ui/uiSlice.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';

// Opens a conversation (or closes it, with null). Opening a contact checks whether they are online, by trying to
// connect: that is the only time we "ask", nothing is published otherwise.
export const selectConversation = (key: string | null): AppThunk => (dispatch, getState) => {
  const from = key ? getState().chat.unread[key]?.from : undefined;

  dispatch(conversationSelected(key));
  dispatch(unreadLineSet(key && from !== undefined ? { key, id: from } : null));

  if (!key) {
    return;
  }

  dispatch(conversationRead(key));

  if (getState().contacts.list.some(c => c.id === key)) {
    void dispatch(connectContact(key));
  }
};
