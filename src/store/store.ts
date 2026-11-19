import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import { callReducer } from './call/callSlice.ts';
import { chatReducer } from './chat/chatSlice.ts';
import { connectionReducer } from './connection/connectionSlice.ts';

export const store = configureStore({
  reducer: {
    connection: connectionReducer,
    chat: chatReducer,
    call: callReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export type AppThunk<R = void> = ThunkAction<R, RootState, undefined, UnknownAction>;
