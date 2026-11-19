import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatState, FileMessage, TextMessage } from './types.ts';

const initialState: ChatState = {
  messages: [],
};

const findFile = (state: ChatState, id: string) => state.messages.find(
  (message): message is FileMessage => message.kind === 'file' && message.id === id,
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: {
      reducer: (state, { payload }: PayloadAction<TextMessage>) => {
        state.messages.push(payload);
      },
      prepare: ({ from, text }: Pick<TextMessage, 'from' | 'text'>) => ({
        payload: { kind: 'text' as const, id: nanoid(), from, text },
      }),
    },
    fileAdded: {
      reducer: (state, { payload }: PayloadAction<FileMessage>) => {
        state.messages.push(payload);
      },
      prepare: (file: Omit<FileMessage, 'kind'>) => ({ payload: { ...file, kind: 'file' as const } }),
    },
    fileProgress: (state, { payload }: PayloadAction<{ id: string; transferred: number }>) => {
      const file = findFile(state, payload.id);

      if (file) {
        file.transferred = payload.transferred;
      }
    },
    fileCompleted: (state, { payload }: PayloadAction<{ id: string; url: string }>) => {
      const file = findFile(state, payload.id);

      if (file) {
        file.url = payload.url;
        file.transferred = file.size;
        file.status = 'done';
      }
    },
    fileFailed: (state, { payload }: PayloadAction<string>) => {
      const file = findFile(state, payload);

      if (file) {
        file.status = 'failed';
      }
    },
  },
});

export const { addMessage, fileAdded, fileProgress, fileCompleted, fileFailed } = chatSlice.actions;

export const chatReducer = chatSlice.reducer;
