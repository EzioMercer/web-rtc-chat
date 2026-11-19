import { unreadAdded } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';

// Counts a new message from the peer as unread unless its conversation is open and visible.
export const countUnread = (key: string): AppThunk => (dispatch, getState) => {
  if (getState().ui.selected !== key || document.hidden) {
    dispatch(unreadAdded(key));
  }
};
