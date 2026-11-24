import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UiState } from './types.ts';

const initialState: UiState = {
  selected: null,
  replying: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    conversationSelected: (state, { payload }: PayloadAction<string | null>) => {
      state.selected = payload;
    },
    replyStarted: (state, { payload }: PayloadAction<{ key: string; id: string }>) => {
      state.replying[payload.key] = payload.id;
    },
    replyEnded: (state, { payload }: PayloadAction<string>) => {
      delete state.replying[payload];
    },
  },
});

export const { conversationSelected, replyStarted, replyEnded } = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
