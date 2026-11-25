import { type Message, MessageAuthor, MessageKind } from './types.ts';

// Their messages count as unread (a marker of one we deleted doesn't; ours and the app's own notes never do).
export const countsAsUnread = (message: Message) => message.from === MessageAuthor.Peer
  && message.kind !== MessageKind.Deleted;
