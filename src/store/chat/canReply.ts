import { FileStatus, type Message, MessageAuthor, MessageKind } from './types.ts';

// Whether a message can be answered: the other side must have it, or get it before the reply. Texts and locations of
// ours still waiting go first on the same channel, so they can; a file of ours goes on a channel of its own and could
// arrive after the reply, so only a sent one can (like Telegram and WhatsApp). Ours given up on may never arrive, and
// the app's own notes are only here.
export const canReply = (message: Message | undefined): boolean => {
  if (!message || message.from === MessageAuthor.System) {
    return false;
  }

  const mine = message.from === MessageAuthor.Me;

  switch (message.kind) {
    case MessageKind.Text:
    case MessageKind.Location:
      return !(mine && message.unsent);
    case MessageKind.File:
      return !mine || message.status === FileStatus.Done;
    default:
      return false;
  }
};
