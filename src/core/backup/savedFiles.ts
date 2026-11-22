import { type FileMessage, type Message, FileStatus, MessageKind } from '../../store/chat/types.ts';

// The files of a chat that have content to back up.
export const savedFiles = (messages: Message[]) => messages.filter(
  (message): message is FileMessage => message.kind === MessageKind.File && message.status === FileStatus.Done,
);
