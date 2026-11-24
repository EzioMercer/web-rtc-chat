import type { StoredMessage } from '../history/types.ts';
import {
  FileStatus,
  type LocationMessage,
  MessageAuthor,
  MessageKind,
  type ReplyLinks,
} from '../../store/chat/types.ts';
import { validPoint } from '../location/validPoint.ts';

const AUTHORS = new Set<string>(Object.values(MessageAuthor));

// A reply's link and the list of its replies are ids (see ReplyLinks).
const validLinks = (m: Partial<ReplyLinks>) => (m.replyTo === undefined || typeof m.replyTo === 'string')
  && (m.replies === undefined || (Array.isArray(m.replies) && m.replies.every(id => typeof id === 'string')));

// Keeps the messages from a backup that look like messages (with an id safe to use in storage keys); the rest is
// dropped. Kinds this version doesn't know are kept as they are (see MessageList).
export const validMessages = (messages: unknown): StoredMessage[] => (Array.isArray(messages) ? messages : [])
  .filter((m: Partial<StoredMessage> | null) => Boolean(m)
    && typeof m?.id === 'string' && /^[\w.-]{1,70}$/.test(m.id)
    && typeof m.kind === 'number' && AUTHORS.has(String(m.from))
    && validLinks(m as Partial<ReplyLinks>)
    && (m.kind !== MessageKind.Text || typeof m.text === 'string')
    && (m.kind !== MessageKind.Location || validPoint(m as Partial<LocationMessage>))
    && (m.kind !== MessageKind.File || (typeof m.name === 'string' && typeof m.mime === 'string'
      && Number.isSafeInteger(m.size) && (m.size ?? -1) >= 0 && FileStatus[m.status as FileStatus] !== undefined)));
