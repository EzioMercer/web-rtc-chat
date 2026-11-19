export type MessageAuthor = 'me' | 'peer' | 'system';

export type TextMessage = {
  kind: 'text';
  id: string;
  from: MessageAuthor;
  text: string;
};

export type FileMessage = {
  kind: 'file';
  id: string;
  from: MessageAuthor;
  name: string;
  size: number;
  mime: string;
  // Object URL of the file; on the receiving side it is set once the whole file arrived.
  url: string | null;
  transferred: number;
  status: 'transferring' | 'done' | 'failed';
};

export type Message = TextMessage | FileMessage;

export type ChatState = {
  messages: Message[];
};
