import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BackupState } from './types.ts';

const initialState: BackupState = {
  running: false,
  title: '',
  done: 0,
  total: 0,
  startedAt: 0,
};

const backupSlice = createSlice({
  name: 'backup',
  initialState,
  reducers: {
    backupStarted: (_state, { payload }: PayloadAction<{ title: string; total: number }>) => ({
      running: true,
      title: payload.title,
      done: 0,
      total: payload.total,
      startedAt: Date.now(),
    }),
    backupProgress: (state, { payload }: PayloadAction<number>) => {
      state.done = payload;
    },
    backupEnded: () => initialState,
  },
});

export const { backupStarted, backupProgress, backupEnded } = backupSlice.actions;

export const backupReducer = backupSlice.reducer;
