import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SessionsState, SessionStatus } from './types.ts';

const initialState: SessionsState = {
  status: {},
  detail: {},
  log: {},
};

const LOG_LIMIT = 40;

const time = () => new Date().toTimeString().slice(0, 8);

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    sessionStatusChanged: (state, { payload }: PayloadAction<{ key: string; status: SessionStatus }>) => {
      state.status[payload.key] = payload.status;
    },
    sessionDetail: (state, { payload }: PayloadAction<{ key: string; detail: string }>) => {
      state.detail[payload.key] = payload.detail;

      if (payload.detail) {
        state.log[payload.key] = [...(state.log[payload.key] ?? []), `${time()} ${payload.detail}`].slice(-LOG_LIMIT);
      }
    },
    sessionLogged: (state, { payload }: PayloadAction<{ key: string; text: string }>) => {
      state.log[payload.key] = [...(state.log[payload.key] ?? []), `${time()} ${payload.text}`].slice(-LOG_LIMIT);
    },
  },
});

export const { sessionStatusChanged, sessionDetail, sessionLogged } = sessionsSlice.actions;

export const sessionsReducer = sessionsSlice.reducer;
