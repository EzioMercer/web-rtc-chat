import { unreadSeen } from '../../chat/chatSlice.ts';
import { unreadLineSet } from '../../ui/uiSlice.ts';
import type { AppThunk } from '../../store.ts';

// The open conversation came into view again: what came while it was hidden is seen, and the "Unread messages" line
// goes before it (unless the line is already in this conversation: it stays where it was, above).
export const seeConversation = (key: string): AppThunk => (dispatch, getState) => {
  const { chat, ui } = getState();
  const from = chat.unread[key]?.from;

  if (from !== undefined && ui.unreadLine?.key !== key) {
    dispatch(unreadLineSet({ key, id: from }));
  }

  dispatch(unreadSeen(key));
};
