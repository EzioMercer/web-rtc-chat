import { countsAsUnread } from './countsAsUnread.ts';
import type { Message } from './types.ts';

// How many of their messages are unread: theirs from `from` (the first unread one) to the end. Counted from the end,
// where unread messages are, so a long chat costs only its unread part.
export const unreadCount = (messages: Message[] | undefined, from: string | undefined) => {
  if (!messages || from === undefined) {
    return 0;
  }

  let count = 0;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];

    if (countsAsUnread(message)) {
      count += 1;
    }

    if (message.id === from) {
      return count;
    }
  }

  return 0;
};
