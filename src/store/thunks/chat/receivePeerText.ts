import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { countUnread } from './countUnread.ts';

export const receivePeerText = (key: string, text: string): AppThunk => (dispatch) => {
  dispatch(addMessage({ key, from: 'peer', text }));
  dispatch(countUnread(key));
};
