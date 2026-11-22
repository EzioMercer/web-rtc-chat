import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { saveContacts } from '../identity/saveContacts.ts';
import { saveSettings } from '../identity/saveSettings.ts';
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
    const { list } = (api.getState() as { contacts: { list: Contact[] } }).contacts;

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
