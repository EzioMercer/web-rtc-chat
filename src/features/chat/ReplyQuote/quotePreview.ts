import { type Message, MessageKind, NoteType } from '../../../store/chat/types.ts';

// A message in a few words, for the quote of a reply to it.
export const quotePreview = (message: Message): string => {
  switch (message.kind) {
    case MessageKind.Text:
      return message.text;
    case MessageKind.Location:
      return message.liveUntil === undefined ? 'Location' : 'Live location';
    case MessageKind.File:
      if (message.note) {
        return message.note.type === NoteType.Voice ? 'Voice message' : 'Video message';
      }

      if (message.mime.startsWith('image/')) {
        return 'Photo';
      }

      return message.mime.startsWith('video/') ? 'Video' : message.name;
    default:
      return 'Message';
  }
};
