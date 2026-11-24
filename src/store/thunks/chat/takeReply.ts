import { canReply } from '../../chat/canReply.ts';
import type { AppThunk } from '../../store.ts';
import { replyEnded } from '../../ui/uiSlice.ts';

// The message our next one in `key` answers, if one was chosen and can still be answered (it may have been deleted
// meanwhile). Whatever we send next takes it: a text, a file, a recording or a location.
export const takeReply = (key: string): AppThunk<string | undefined> => (dispatch, getState) => {
  const id = getState().ui.replying[key];

  if (id === undefined) {
    return undefined;
  }

  dispatch(replyEnded(key));

  return canReply(getState().chat.conversations[key]?.find(message => message.id === id)) ? id : undefined;
};
