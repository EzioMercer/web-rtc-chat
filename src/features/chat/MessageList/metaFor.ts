import type { ComponentProps } from 'react';
import { FileStatus, type Message, MessageAuthor, MessageKind } from '../../../store/chat/types.ts';
import type { MessageMeta } from '../../../ui/MessageMeta/MessageMeta.tsx';

type Meta = ComponentProps<typeof MessageMeta>;

// A message's time and, for ours, where it is. A file of ours: waiting (or going again), on its way while it travels,
// delivered once they confirmed it all; a failed one says why in its own text.
export const metaFor = (message: Message): Meta => {
  const { at } = message;

  if (message.from !== MessageAuthor.Me) {
    return { at };
  }

  switch (message.kind) {
    case MessageKind.Text:
    case MessageKind.Location: {
      const { pending, sent, tried, unsent } = message;

      return { at, mark: { pending, sent, tried, unsent } };
    }
    case MessageKind.File:
      switch (message.status) {
        case FileStatus.Done:
          return { at, mark: {} };
        case FileStatus.Transferring:
          return { at, mark: { pending: true, sent: true } };
        case FileStatus.Waiting:
          return { at, mark: { pending: true, tried: message.tried } };
        default:
          return { at };
      }
    default:
      return { at };
  }
};
