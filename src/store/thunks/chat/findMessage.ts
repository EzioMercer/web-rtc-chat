import type { Message } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';

// Conversation `key`'s message with this id, if it has one (a marker of a deleted one counts).
export const findMessage = (key: string, id: string): AppThunk<Message | undefined> => (_dispatch, getState) => (
  getState().chat.conversations[key]?.find(message => message.id === id)
);
