import { type Message, MessageKind } from '../../store/chat/types.ts';
import type { StoredMessage } from './types.ts';

// What is saved of a message: a file's object URL and transfer progress only mean something in this tab.
export const toStored = (message: Message): StoredMessage => {
  if (message.kind !== MessageKind.File) {
    return message;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { url, transferred, packed, ...rest } = message;

  return rest;
};
