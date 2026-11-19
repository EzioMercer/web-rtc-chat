import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UiState } from './types.ts';

const initialState: UiState = {
  selected: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    conversationSelected: (state, { payload }: PayloadAction<string | null>) => {
      state.selected = payload;
    },
  },
});

export const { conversationSelected } = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
