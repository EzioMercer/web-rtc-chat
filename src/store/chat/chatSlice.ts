import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatState, Message } from './types.ts';

const initialState: ChatState = {
  messages: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: {
      reducer: (state, { payload }: PayloadAction<Message>) => {
        state.messages.push(payload);
      },
      prepare: (message: Omit<Message, 'id'>) => ({ payload: { ...message, id: nanoid() } }),
    },
  },
});

export const { addMessage } = chatSlice.actions;

export const chatReducer = chatSlice.reducer;
