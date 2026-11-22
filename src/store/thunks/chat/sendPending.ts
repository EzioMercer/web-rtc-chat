import { sendControl } from '../../../core/webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';

// The connection (re)opened: send every message the other side hasn't confirmed yet, in order. If one already
// arrived (only the confirmation was lost), the other side ignores the copy.
export const sendPending = (key: string): AppThunk => (_dispatch, getState) => {
  getState().chat.conversations[key]?.forEach((message) => {
    if (message.kind === 'text' && message.pending) {
      const waited = Date.now() - (message.at ?? Date.now());

      sendControl(key, { t: 'text', text: message.text, id: message.id, waited });
    }
  });
};
