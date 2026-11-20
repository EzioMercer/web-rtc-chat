export type MessageAuthor = 'me' | 'peer' | 'system';

export type TextMessage = {
  kind: 'text';
  id: string;
  from: MessageAuthor;
  text: string;
  // When it was written, on this device's clock (see receivePeerText for theirs).
  at?: number;
  // Our messages: waiting for the other side to confirm it arrived (sent again when the connection reopens).
  pending?: boolean;
};

export type FileMessage = {
  kind: 'file';
  id: string;
  from: MessageAuthor;
  name: string;
  size: number;
  mime: string;
  // Object URL of the file (in memory); on the receiving side it is set once the whole file arrived.
  url: string | null;
  transferred: number;
  status: 'transferring' | 'done' | 'failed';
  at?: number;
};

export type Message = TextMessage | FileMessage;

// Memory only. Nothing here is ever saved.
export type ChatState = {
  // Conversation key (contact id, or the manual connection) -> messages.
  conversations: Record<string, Message[]>;
  unread: Record<string, number>;
};
