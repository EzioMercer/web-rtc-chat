import { conversationCleared } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { revokeFiles } from './revokeFiles.ts';

export const clearConversation = (key: string): AppThunk => (dispatch, getState) => {
  revokeFiles(getState().chat.conversations[key]);
  dispatch(conversationCleared(key));
};
