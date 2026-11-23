import { type LocationMessage, MessageAuthor, MessageKind } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';

// One of our locations in conversation `key`, if it is still there.
export const findOurLocation = (key: string, id: string): AppThunk<LocationMessage | undefined> => (
  _dispatch,
  getState,
) => getState().chat.conversations[key]?.find(
  (message): message is LocationMessage => message.kind === MessageKind.Location && message.id === id
    && message.from === MessageAuthor.Me,
);
