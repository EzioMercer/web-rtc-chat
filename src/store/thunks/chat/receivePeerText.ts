import { sendControl } from '../../../webrtc/sendControl.ts';
import { peerTextReceived } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { countUnread } from './countUnread.ts';

// Message ids seen per conversation, so a message sent again (see sendPending) shows once.
const seen = new Map<string, Set<string>>();

// Longest wait we believe; anything else counts as written now.
const MAX_WAITED_MS = 7 * 24 * 3600 * 1000;

// `waited`: how long it waited on their side before being sent. It is shown where it was written, among ours.
export const receivePeerText = (key: string, text: string, id: unknown, waited: unknown): AppThunk => (dispatch) => {
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

  const delay = typeof waited === 'number' && waited > 0 && waited < MAX_WAITED_MS ? waited : 0;

  dispatch(peerTextReceived({ key, text, at: Date.now() - delay }));
  dispatch(countUnread(key));
};
