import { chatsRead } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';

// Every chat loses its count and dot. Only this device knows: nothing about reading is sent.
export const markAllChatsRead = (): AppThunk => (dispatch, getState) => {
  dispatch(chatsRead(Object.keys(getState().chat.unread)));
};
