import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { peerTextReceived } from '../../chat/chatSlice.ts';
import { peerMessageId } from '../../chat/peerMessageId.ts';
import type { AppThunk } from '../../store.ts';
import { countUnread } from './countUnread.ts';
import { ControlType } from '../../../core/webrtc/types.ts';

// Longest wait we believe; anything else counts as written now.
const MAX_WAITED_MS = 7 * 24 * 3600 * 1000;

// `waited`: how long it waited on their side before being sent. It is shown where it was written, among ours.
export const receivePeerText = (key: string, text: string, id: unknown, waited: unknown): AppThunk => (
  dispatch,
  getState,
) => {
  const ours = peerMessageId(id);

  if (!ours || typeof id !== 'string') {
    return;
  }

  // Confirm it arrived, even if it's a copy: the first confirmation may have been lost.
  sendControl(key, { t: ControlType.Ack, id });

  // A message sent again (see sendPending) shows once, also after a reload: the chat is saved with their ids.
  if (getState().chat.conversations[key]?.some(message => message.id === ours)) {
    return;
  }

  const delay = typeof waited === 'number' && waited > 0 && waited < MAX_WAITED_MS ? waited : 0;

  dispatch(peerTextReceived({ key, id: ours, text, at: Date.now() - delay }));
  dispatch(countUnread(key));
};
