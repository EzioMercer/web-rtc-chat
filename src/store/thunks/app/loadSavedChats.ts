import { historySaver } from '../../../core/history/historySaver.ts';
import { loadHistory } from '../../../core/history/loadHistory.ts';
import { requestPersistence } from '../../../core/storage/requestPersistence.ts';
import { addMessage, historyLoaded } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { MessageAuthor } from '../../chat/types.ts';

// Chats that already said they couldn't be saved, so a full device doesn't fill the chat with the same note.
const warned = new Set<string>();

const saveFailedText = (err: unknown) => (
  err instanceof DOMException && err.name === 'QuotaExceededError'
    ? 'Not saved on this device: its storage is full. Free some space; until then new messages stay only in this tab.'
    : `Not saved on this device: ${err instanceof Error ? err.message : 'storage failed'}.`
);

// After unlocking: the saved chats back into the store, and asks the browser to keep them.
export const loadSavedChats = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  historySaver.reset();
  historySaver.setErrorHandler((chat, err) => {
    console.error('Chat not saved', err);

    if (!warned.has(chat)) {
      warned.add(chat);
      dispatch(addMessage({ key: chat, from: MessageAuthor.System, text: saveFailedText(err) }));
    }
  });

  const history = await loadHistory(getState().contacts.list.map(contact => contact.id));

  dispatch(historyLoaded(history));
  historySaver.loaded(getState().chat.conversations);
  void requestPersistence();
};
