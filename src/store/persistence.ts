import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { deleteChat } from '../core/history/deleteChat.ts';
import { historySaver } from '../core/history/historySaver.ts';
import { memoryFileKey } from '../core/history/memoryFileKey.ts';
import { memoryFiles } from '../core/history/memoryFiles.ts';
import { saveFileBytes } from '../core/history/saveFileBytes.ts';
import { saveUnread } from '../core/history/saveUnread.ts';
import { saveContacts } from '../core/identity/saveContacts.ts';
import { saveSettings } from '../core/identity/saveSettings.ts';
import {
  addMessage,
  conversationCleared,
  conversationRead,
  fileAdded,
  fileCompleted,
  fileFailed,
  messageDelivered,
  messageQueued,
  peerTextReceived,
  unreadAdded,
} from './chat/chatSlice.ts';
import type { ChatState } from './chat/types.ts';
import {
  contactAdded,
  contactDeleted,
  contactMoved,
  contactRenamed,
  contactReplaced,
  favouriteToggled,
  secretAdopted,
  secretConfirmed,
  secretProposed,
  verifiedSet,
} from './contacts/contactsSlice.ts';
import type { Contact } from './contacts/types.ts';
import { echoGuardChosen } from './settings/settingsSlice.ts';
import type { SettingsState } from './settings/types.ts';
import { refreshMailboxes } from './thunks/signal/refreshMailboxes.ts';

type State = { contacts: { list: Contact[] }; chat: ChatState };

// Saves the (encrypted) contact list and updates the mailboxes we listen on whenever contacts change.
export const persistence = createListenerMiddleware();

persistence.startListening({
  matcher: isAnyOf(
    contactAdded,
    contactDeleted,
    contactMoved,
    contactRenamed,
    contactReplaced,
    favouriteToggled,
    secretAdopted,
    secretConfirmed,
    secretProposed,
    verifiedSet,
  ),
  effect: async (_action, api) => {
    const { list } = (api.getState() as State).contacts;

    await saveContacts(list);
    // Typed loosely here to avoid a circular type between the store and its listeners.
    api.dispatch(refreshMailboxes() as never);
  },
});

// Saves this device's (encrypted) settings whenever the user changes one.
persistence.startListening({
  actionCreator: echoGuardChosen,
  effect: async (_action, api) => {
    await saveSettings((api.getState() as { settings: SettingsState }).settings);
  },
});

// Saves a contact's chat a moment after it changes (not the manual connection, which isn't a contact). A file's
// progress doesn't change what is saved, so it doesn't count.
persistence.startListening({
  matcher: isAnyOf(addMessage, peerTextReceived, messageQueued, messageDelivered, fileAdded, fileCompleted, fileFailed),
  effect: (action, api) => {
    const { key } = (action as unknown as { payload: { key: string } }).payload;

    if ((api.getState() as State).contacts.list.some(contact => contact.id === key)) {
      historySaver.schedule(key, () => (api.getState() as State).chat.conversations[key]);
    }
  },
});

// A file that arrived or went out completely is saved too.
persistence.startListening({
  actionCreator: fileCompleted,
  effect: async ({ payload }, api) => {
    const blob = memoryFiles.get(memoryFileKey(payload.key, payload.id));

    if (blob && (api.getState() as State).contacts.list.some(contact => contact.id === payload.key)) {
      await saveFileBytes(payload.key, payload.id, blob).catch((err: unknown) => console.error('File not saved', err));
    }
  },
});

persistence.startListening({
  matcher: isAnyOf(unreadAdded, conversationRead, conversationCleared),
  effect: async (_action, api) => {
    await saveUnread((api.getState() as State).chat.unread).catch(() => undefined);
  },
});

persistence.startListening({
  actionCreator: conversationCleared,
  effect: async ({ payload }) => {
    await deleteChat(payload);
  },
});
