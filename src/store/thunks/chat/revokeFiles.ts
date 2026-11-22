import { type Message, MessageKind } from '../../chat/types.ts';

// Frees the memory held by files in these messages.
export const revokeFiles = (messages: Message[] | undefined) => {
  messages?.forEach((message) => {
    if (message.kind === MessageKind.File && message.url) {
      URL.revokeObjectURL(message.url);
    }
  });
};
