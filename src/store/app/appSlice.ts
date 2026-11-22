import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProtectionMode, StoredMode } from '../../core/identity/types.ts';
import { type AppState, AppPhase } from './types.ts';

const initialState: AppState = {
  phase: AppPhase.Loading,
  mode: null,
  lockedMode: null,
  busy: false,
  error: null,
  paused: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    otherTabFound: (state) => {
      state.phase = AppPhase.OtherTab;
    },
    setupNeeded: (state) => {
      state.phase = AppPhase.Setup;
      state.busy = false;
    },
    lockedFound: (state, { payload }: PayloadAction<StoredMode>) => {
      state.phase = AppPhase.Locked;
      state.lockedMode = payload;
      state.busy = false;
    },
    unlocked: (state, { payload }: PayloadAction<ProtectionMode>) => {
      state.phase = AppPhase.Ready;
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
    pausedChanged: (state, { payload }: PayloadAction<boolean>) => {
      state.paused = payload;
    },
  },
});

export const {
  otherTabFound,
  setupNeeded,
  lockedFound,
  unlocked,
  busyStarted,
  failed,
  errorCleared,
  pausedChanged,
} = appSlice.actions;

export const appReducer = appSlice.reducer;
