import type { FileMessage, LocationMessage, TextMessage } from '../../store/chat/types.ts';

// A message as saved: without what only matters while a file travels (its object URL and progress).
export type StoredMessage = TextMessage | LocationMessage | Omit<FileMessage, 'url' | 'transferred' | 'packed'>;

// One saved page of a chat. `format` changes only if a saved message's meaning changes; new optional fields don't
// need a new format (missing means the default).
export type StoredPage = {
  format: number;
  messages: StoredMessage[];
};
