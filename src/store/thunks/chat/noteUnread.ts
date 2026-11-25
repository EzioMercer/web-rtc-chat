import { unreadArrived } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';

// Their new message `id` is unread unless its conversation is open and visible.
export const noteUnread = (key: string, id: string): AppThunk => (dispatch, getState) => {
  if (getState().ui.selected !== key || document.hidden) {
    dispatch(unreadArrived({ key, id }));
  }
};
