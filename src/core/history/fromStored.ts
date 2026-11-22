import { FileStatus, type Message, MessageKind } from '../../store/chat/types.ts';
import type { StoredMessage } from './types.ts';

// The app was closed in the middle of the transfer: it can't go on.
const INTERRUPTED = 'Stopped: the app was closed.';

// A saved message, back in the chat. Files are opened from storage when they are shown (see loadFileBlob).
export const fromStored = (message: StoredMessage): Message => {
  if (message.kind !== MessageKind.File) {
    return message as Message;
  }

  const done = message.status === FileStatus.Done;

  return {
    ...message,
    url: null,
    transferred: done ? message.size : 0,
    ...(message.status === FileStatus.Transferring ? { status: FileStatus.Failed, error: INTERRUPTED } : {}),
  };
};
