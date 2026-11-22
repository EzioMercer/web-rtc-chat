import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import { appReducer } from './app/appSlice.ts';
import { backupReducer } from './backup/backupSlice.ts';
import { callReducer } from './call/callSlice.ts';
import { chatReducer } from './chat/chatSlice.ts';
import { contactsReducer } from './contacts/contactsSlice.ts';
import { invitesReducer } from './invites/invitesSlice.ts';
import { manualReducer } from './manual/manualSlice.ts';
import { persistence } from './persistence.ts';
import { sessionsReducer } from './sessions/sessionsSlice.ts';
import { settingsReducer } from './settings/settingsSlice.ts';
import { uiReducer } from './ui/uiSlice.ts';

export const store = configureStore({
  reducer: {
    app: appReducer,
    contacts: contactsReducer,
    sessions: sessionsReducer,
    manual: manualReducer,
    chat: chatReducer,
    call: callReducer,
    invites: invitesReducer,
    ui: uiReducer,
    settings: settingsReducer,
    backup: backupReducer,
  },
  middleware: getDefault => getDefault().prepend(persistence.middleware),
  // The store holds messages and mailbox secrets: no inspection by browser extensions in production.
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export type AppThunk<R = void> = ThunkAction<R, RootState, undefined, UnknownAction>;
