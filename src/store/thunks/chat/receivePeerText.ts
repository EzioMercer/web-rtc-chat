import { sendControl } from '../../../webrtc/sendControl.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { countUnread } from './countUnread.ts';

// Message ids seen per conversation, so a message sent again (see sendPending) shows once.
const seen = new Map<string, Set<string>>();

export const receivePeerText = (key: string, text: string, id: unknown): AppThunk => (dispatch) => {
  if (typeof id === 'string') {
    // Confirm it arrived, even if it's a copy: the first confirmation may have been lost.
    sendControl(key, { t: 'ack', id });

    const ids = seen.get(key) ?? new Set<string>();

    seen.set(key, ids);

    if (ids.has(id)) {
      return;
    }

    ids.add(id);
  }

  dispatch(addMessage({ key, from: 'peer', text }));
  dispatch(countUnread(key));
};
