import { sendControl } from '../../../core/webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';
import { messagesExpired, messagesSent } from '../../chat/chatSlice.ts';
import { FileStatus, MessageAuthor, MessageKind } from '../../chat/types.ts';
import { ControlType } from '../../../core/webrtc/types.ts';
import { locationSignal } from '../location/locationSignal.ts';
import { replyField } from '../../chat/replyField.ts';
import { uploadFile } from './uploadFile.ts';

// The connection (re)opened: send every message, location and file the other side hasn't confirmed, in order, unless
// it waited longer than RESEND_MS (then it shows as not sent). If one already arrived (only the confirmation was
// lost), the other side ignores the copy. The stop of a live location we deleted goes too.
export const sendPending = (key: string): AppThunk => (dispatch, getState) => {
  dispatch(messagesExpired(Date.now()));

  const sent: string[] = [];

  getState().chat.conversations[key]?.forEach((message) => {
    const waited = Date.now() - (message.at ?? Date.now());

    if (message.kind === MessageKind.Text && message.pending && !message.unsent
      && sendControl(key, {
        t: ControlType.Text,
        text: message.text,
        id: message.id,
        waited,
        ...replyField(message),
      })) {
      sent.push(message.id);
    }

    // A location goes in its latest state (a live one may have moved or stopped meanwhile).
    if (message.kind === MessageKind.Location && message.pending && !message.unsent
      && sendControl(key, locationSignal(message, waited))) {
      sent.push(message.id);
    }

    if (message.kind === MessageKind.Deleted && message.stop) {
      sendControl(key, locationSignal(message.stop, waited));
    }

    if (message.kind === MessageKind.File && message.from === MessageAuthor.Me
      && message.status === FileStatus.Waiting) {
      void dispatch(uploadFile(key, message.id));
    }
  });

  if (sent.length) {
    dispatch(messagesSent({ key, ids: sent }));
  }
};
