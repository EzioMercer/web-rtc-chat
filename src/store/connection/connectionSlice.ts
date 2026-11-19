import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ConnectionState, Role } from './types.ts';

const initialState: ConnectionState = {
  role: 'none',
  status: 'idle',
  myCode: '',
  error: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    generationStarted: (state) => {
      state.status = 'generating';
      state.error = null;
    },
    codeGenerated: (state, { payload }: PayloadAction<{ role: Role; code: string }>) => {
      state.role = payload.role;
      state.myCode = payload.code;
      state.status = 'waiting';
    },
    connecting: (state) => {
      state.status = 'connecting';
      state.error = null;
    },
    connected: (state) => {
      state.status = 'connected';
      state.error = null;
    },
    disconnected: (state) => {
      state.status = 'disconnected';
    },
    connectionFailed: (state) => {
      state.status = 'failed';
      state.error = 'Connection failed. Reload the page to try again.';
    },
    // A step failed (e.g. a wrong code was pasted): show why and go back to the last stable status.
    stepFailed: (state, { payload }: PayloadAction<string>) => {
      state.status = state.role === 'none' ? 'idle' : 'waiting';
      state.error = payload;
    },
  },
});

export const {
  generationStarted,
  codeGenerated,
  connecting,
  connected,
  disconnected,
  connectionFailed,
  stepFailed,
} = connectionSlice.actions;

export const connectionReducer = connectionSlice.reducer;
