import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ManualState, Role } from './types.ts';

const initialState: ManualState = {
  role: 'none',
  status: 'idle',
  myCode: '',
  error: null,
  safetyWords: null,
};

const manualSlice = createSlice({
  name: 'manual',
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
    connected: (state, { payload }: PayloadAction<string[]>) => {
      state.status = 'connected';
      state.error = null;
      state.safetyWords = payload;
    },
    disconnected: (state) => {
      state.status = 'disconnected';
    },
    connectionFailed: (state) => {
      state.status = 'failed';
      state.error = 'No network path found yet. Still trying; if nothing happens, start over.';
    },
    // A step failed (e.g. a wrong code was pasted): show why and go back to the last stable status.
    stepFailed: (state, { payload }: PayloadAction<string>) => {
      state.status = state.role === 'none' ? 'idle' : 'waiting';
      state.error = payload;
    },
    manualReset: () => initialState,
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
  manualReset,
} = manualSlice.actions;

export const manualReducer = manualSlice.reducer;
