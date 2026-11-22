import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type ManualState, ManualStatus, ManualRole } from './types.ts';

const initialState: ManualState = {
  role: ManualRole.None,
  status: ManualStatus.Idle,
  myCode: '',
  error: null,
  safetyWords: null,
};

const manualSlice = createSlice({
  name: 'manual',
  initialState,
  reducers: {
    generationStarted: (state) => {
      state.status = ManualStatus.Generating;
      state.error = null;
    },
    codeGenerated: (state, { payload }: PayloadAction<{ role: ManualRole; code: string }>) => {
      state.role = payload.role;
      state.myCode = payload.code;
      state.status = ManualStatus.Waiting;
    },
    connecting: (state) => {
      state.status = ManualStatus.Connecting;
      state.error = null;
    },
    connected: (state, { payload }: PayloadAction<string[]>) => {
      state.status = ManualStatus.Connected;
      state.error = null;
      state.safetyWords = payload;
    },
    disconnected: (state) => {
      state.status = ManualStatus.Disconnected;
    },
    connectionFailed: (state) => {
      state.status = ManualStatus.Failed;
      state.error = 'No network path found yet. Still trying; if nothing happens, start over.';
    },
    // A step failed (e.g. a wrong code was pasted): show why and go back to the last stable status.
    stepFailed: (state, { payload }: PayloadAction<string>) => {
      state.status = state.role === ManualRole.None ? ManualStatus.Idle : ManualStatus.Waiting;
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
