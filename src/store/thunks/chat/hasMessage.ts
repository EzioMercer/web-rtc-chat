import type { AppThunk } from '../../store.ts';

// Whether conversation `key` already has a message with this id.
export const hasMessage = (key: string, id: string): AppThunk<boolean> => (_dispatch, getState) => (
  getState().chat.conversations[key]?.some(message => message.id === id) ?? false
);
