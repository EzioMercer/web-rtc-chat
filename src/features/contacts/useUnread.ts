import { unreadCount } from '../../store/chat/unreadCount.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';

// What is unread in a chat: how many of their messages, and whether it was marked as unread by hand.
export const useUnread = (key: string) => {
  const count = useAppSelector(state => unreadCount(state.chat.conversations[key], state.chat.unread[key]?.from));
  const dot = useAppSelector(state => state.chat.unread[key]?.dot === true);

  return { count, dot };
};
