import { type Message, MessageAuthor, MessageKind } from '../../../store/chat/types.ts';

// What "Delete for me?" says: it goes from this device only, and our running live location stops too.
export const deleteQuestion = (message: Message): string => {
  const here = 'It is deleted only on this device.';
  const running = message.kind === MessageKind.Location && message.from === MessageAuthor.Me
    && message.liveUntil !== undefined && message.liveUntil > Date.now();

  return running ? `${here} Sharing your live location stops too.` : here;
};
