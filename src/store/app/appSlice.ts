import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProtectionMode, StoredMode } from '../../core/identity/types.ts';
import type { AppState } from './types.ts';

const initialState: AppState = {
  phase: 'loading',
  mode: null,
  lockedMode: null,
  busy: false,
  error: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setupNeeded: (state) => {
      state.phase = 'setup';
      state.busy = false;
    },
    lockedFound: (state, { payload }: PayloadAction<StoredMode>) => {
      state.phase = 'locked';
      state.lockedMode = payload;
      state.busy = false;
    },
    unlocked: (state, { payload }: PayloadAction<ProtectionMode>) => {
      state.phase = 'ready';
      state.mode = payload;
      state.busy = false;
      state.error = null;
    },
    busyStarted: (state) => {
      state.busy = true;
      state.error = null;
    },
    failed: (state, { payload }: PayloadAction<string>) => {
      state.busy = false;
      state.error = payload;
    },
    errorCleared: (state) => {
      state.error = null;
    },
  },
});

export const { setupNeeded, lockedFound, unlocked, busyStarted, failed, errorCleared } = appSlice.actions;

export const appReducer = appSlice.reducer;
