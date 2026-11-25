import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { deleteChat } from '../core/history/deleteChat.ts';
import { historySaver } from '../core/history/historySaver.ts';
import { memoryFileKey } from '../core/history/memoryFileKey.ts';
import { memoryFiles } from '../core/history/memoryFiles.ts';
import { saveFileBytes } from '../core/history/saveFileBytes.ts';
import { saveUnread } from '../core/history/saveUnread.ts';
import { saveContacts } from '../core/identity/saveContacts.ts';
import { saveProfile } from '../core/identity/saveProfile.ts';
import { saveSettings } from '../core/identity/saveSettings.ts';
import {
  addMessage,
  conversationCleared,
  conversationRead,
  fileAdded,
  fileCompleted,
  fileFailed,
  locationAdded,
  locationChanged,
  messageDelivered,
  messageDeleted,
  messageMovedToEnd,
  messageQueued,
  messagesExpired,
  fileRestarted,
  fileWaiting,
  peerLocationReceived,
  peerTextReceived,
  unreadArrived,
  unreadSeen,
  markedUnread,
} from './chat/chatSlice.ts';
import { type ChatState, MessageAuthor, MessageKind } from './chat/types.ts';
import {
  contactAdded,
  contactDeleted,
  contactMoved,
  contactRenamed,
  contactReplaced,
  favouriteToggled,
  infoReceived,
  pictureReceived,
  secretAdopted,
  secretConfirmed,
  secretProposed,
  verifiedSet,
} from './contacts/contactsSlice.ts';
import type { Contact } from './contacts/types.ts';
import { infoChosen, pictureChosen } from './profile/profileSlice.ts';
import type { ProfileState } from './profile/types.ts';
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
    infoReceived,
    pictureReceived,
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

// Saves what our contacts see of us (encrypted) whenever we change it.
persistence.startListening({
  matcher: isAnyOf(infoChosen, pictureChosen),
  effect: async (_action, api) => {
    await saveProfile((api.getState() as { profile: ProfileState }).profile);
  },
});

// Saves a contact's chat a moment after it changes (not the manual connection, which isn't a contact). A file's
// progress doesn't change what is saved, so it doesn't count.
persistence.startListening({
  matcher: isAnyOf(
    addMessage,
    peerTextReceived,
    messageQueued,
    messageDelivered,
    fileAdded,
    fileCompleted,
    fileFailed,
    locationAdded,
    peerLocationReceived,
    locationChanged,
    messageDeleted,
    messageMovedToEnd,
    fileRestarted,
    fileWaiting,
  ),
  effect: (action, api) => {
    const { key } = (action as unknown as { payload: { key: string } }).payload;

    if ((api.getState() as State).contacts.list.some(contact => contact.id === key)) {
      historySaver.schedule(key, () => (api.getState() as State).chat.conversations[key]);
    }
  },
});

// Waiting too long or wiped markers can change any chat; unchanged ones aren't written (see historySaver).
persistence.startListening({
  actionCreator: messagesExpired,
  effect: (_action, api) => {
    (api.getState() as State).contacts.list.forEach(({ id }) => {
      historySaver.schedule(id, () => (api.getState() as State).chat.conversations[id]);
    });
  },
});

// A file's content is saved on the device, unless it was deleted meanwhile (or isn't a contact's).
const saveFile = (chat: string, id: string, from: MessageAuthor, state: State) => {
  const blob = memoryFiles.get(memoryFileKey(chat, id));
  const file = state.chat.conversations[chat]?.find(m => m.kind === MessageKind.File && m.id === id);

  if (!blob || file?.from !== from || !state.contacts.list.some(contact => contact.id === chat)) {
    return Promise.resolve();
  }

  return saveFileBytes(chat, id, blob).catch((err: unknown) => console.error('File not saved', err));
};

// Ours as soon as it is chosen, so it can be sent again after a reload.
persistence.startListening({
  actionCreator: fileAdded,
  effect: async ({ payload }, api) => {
    await saveFile(payload.key, payload.file.id, MessageAuthor.Me, api.getState() as State);
  },
});

// Theirs once it arrived completely.
persistence.startListening({
  actionCreator: fileCompleted,
  effect: async ({ payload }, api) => {
    await saveFile(payload.key, payload.id, MessageAuthor.Peer, api.getState() as State);
  },
});

persistence.startListening({
  matcher: isAnyOf(unreadArrived, unreadSeen, markedUnread, conversationRead, messageDeleted, conversationCleared),
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
