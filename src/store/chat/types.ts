export type MessageAuthor = 'me' | 'peer' | 'system';

export type Message = {
  id: string;
  from: MessageAuthor;
  text: string;
};

export type ChatState = {
  messages: Message[];
};
