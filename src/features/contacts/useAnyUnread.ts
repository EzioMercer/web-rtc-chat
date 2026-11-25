import { unreadCount } from '../../store/chat/unreadCount.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';

// Whether any chat has a count or a dot. Stops at the first one found.
export const useAnyUnread = () => useAppSelector(({ chat }) => Object.entries(chat.unread).some(
  ([key, unread]) => unread.dot === true || unreadCount(chat.conversations[key], unread.from) > 0,
));
