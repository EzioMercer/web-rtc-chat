import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SessionsState, SessionStatus } from './types.ts';

const initialState: SessionsState = {
  status: {},
  detail: {},
};

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    sessionStatusChanged: (state, { payload }: PayloadAction<{ key: string; status: SessionStatus }>) => {
      state.status[payload.key] = payload.status;
    },
    sessionDetail: (state, { payload }: PayloadAction<{ key: string; detail: string }>) => {
      state.detail[payload.key] = payload.detail;
    },
  },
});

export const { sessionStatusChanged, sessionDetail } = sessionsSlice.actions;

export const sessionsReducer = sessionsSlice.reducer;
