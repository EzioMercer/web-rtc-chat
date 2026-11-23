import { conversationCleared } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { liveWatches } from '../../../core/location/liveWatches.ts';
import { stopLiveWatch } from '../location/stopLiveWatch.ts';
import { revokeFiles } from './revokeFiles.ts';

export const clearConversation = (key: string): AppThunk => (dispatch, getState) => {
  revokeFiles(getState().chat.conversations[key]);
  // Our live locations in it stop following us.
  liveWatches.forEach((live, id) => live.key === key && stopLiveWatch(id));
  dispatch(conversationCleared(key));
};
