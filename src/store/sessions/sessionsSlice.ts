import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SessionsState, SessionStatus } from './types.ts';

const initialState: SessionsState = {
  status: {},
};

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    sessionStatusChanged: (state, { payload }: PayloadAction<{ key: string; status: SessionStatus }>) => {
      state.status[payload.key] = payload.status;
    },
  },
});

export const { sessionStatusChanged } = sessionsSlice.actions;

export const sessionsReducer = sessionsSlice.reducer;
