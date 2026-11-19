import type { Message } from '../../chat/types.ts';

// Frees the memory held by files in these messages.
export const revokeFiles = (messages: Message[] | undefined) => {
  messages?.forEach((message) => {
    if (message.kind === 'file' && message.url) {
      URL.revokeObjectURL(message.url);
    }
  });
};
