import { sendControl } from '../../../core/webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';
import { MessageKind } from '../../chat/types.ts';
import { ControlType } from '../../../core/webrtc/types.ts';

// The connection (re)opened: send every message the other side hasn't confirmed yet, in order. If one already
// arrived (only the confirmation was lost), the other side ignores the copy.
export const sendPending = (key: string): AppThunk => (_dispatch, getState) => {
  getState().chat.conversations[key]?.forEach((message) => {
    if (message.kind === MessageKind.Text && message.pending) {
      const waited = Date.now() - (message.at ?? Date.now());

      sendControl(key, { t: ControlType.Text, text: message.text, id: message.id, waited });
    }
  });
};
