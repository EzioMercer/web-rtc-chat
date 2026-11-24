import { FileStatus, type Message, MessageAuthor, MessageKind } from '../../../store/chat/types.ts';
import { MessageAction } from '../MessageMenu/MessageAction.ts';

// The menu of one message. Ours that never left can only be held back ("Don't send"); once a connection took it (it
// may have arrived), or for anything else, it is deleted on this device only. One given up on can be sent again.
export const messageActions = (message: Message): MessageAction[] => {
  const copy = message.kind === MessageKind.Text ? [MessageAction.Copy] : [];
  const mine = message.from === MessageAuthor.Me;
  const file = message.kind === MessageKind.File ? message : null;
  const once = message.kind === MessageKind.Text
    || (message.kind === MessageKind.Location && message.liveUntil === undefined);

  if (mine && file && !file.tried && (file.status === FileStatus.Waiting || file.status === FileStatus.Transferring)) {
    return [MessageAction.DontSend];
  }

  if (mine && file?.status === FileStatus.Failed) {
    return [MessageAction.SendAgain, MessageAction.DeleteForMe];
  }

  if (mine && once && message.pending && message.unsent) {
    return [...copy, MessageAction.SendAgain, MessageAction.DeleteForMe];
  }

  if (mine && once && message.pending && !message.sent && !message.tried) {
    return [...copy, MessageAction.DontSend];
  }

  return [...copy, MessageAction.DeleteForMe];
};
