import { FileStatus, type Message, MessageAuthor, MessageKind } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';

// Ours that goes when the connection opens (see sendPending).
const waiting = (message: Message) => {
  if (message.kind === MessageKind.Deleted) {
    return message.stop !== undefined;
  }

  if (message.from !== MessageAuthor.Me) {
    return false;
  }

  if (message.kind === MessageKind.File) {
    return message.status === FileStatus.Waiting;
  }

  return Boolean(message.pending && !message.unsent);
};

// Connects to every contact we have something waiting for (messages, files, a live location's stop), so it goes
// even if their chat isn't open: after unlocking, and when the device is back online.
export const connectWaiting = (): AppThunk => (dispatch, getState) => {
  const { contacts, chat } = getState();

  contacts.list.forEach(({ id }) => {
    if (chat.conversations[id]?.some(waiting)) {
      void dispatch(connectContact(id));
    }
  });
};
