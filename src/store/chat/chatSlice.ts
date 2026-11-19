import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatState, FileMessage, Message, TextMessage } from './types.ts';

const initialState: ChatState = {
  conversations: {},
  unread: {},
};

const push = (state: ChatState, key: string, message: Message) => {
  (state.conversations[key] ??= []).push(message);
};

const findFile = (state: ChatState, key: string, id: string) => state.conversations[key]?.find(
  (message): message is FileMessage => message.kind === 'file' && message.id === id,
);

type Keyed<T> = { key: string } & T;

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: {
      reducer: (state, { payload }: PayloadAction<Keyed<{ message: TextMessage }>>) => {
        push(state, payload.key, payload.message);
      },
      prepare: ({ key, from, text }: Keyed<Pick<TextMessage, 'from' | 'text'>>) => ({
        payload: { key, message: { kind: 'text' as const, id: nanoid(), from, text } },
      }),
    },
    fileAdded: (state, { payload }: PayloadAction<Keyed<{ file: Omit<FileMessage, 'kind'> }>>) => {
      push(state, payload.key, { ...payload.file, kind: 'file' });
    },
    fileProgress: (state, { payload }: PayloadAction<Keyed<{ id: string; transferred: number }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.transferred = payload.transferred;
      }
    },
    fileCompleted: (state, { payload }: PayloadAction<Keyed<{ id: string; url: string }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.url = payload.url;
        file.transferred = file.size;
        file.status = 'done';
      }
    },
    fileFailed: (state, { payload }: PayloadAction<Keyed<{ id: string }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.status = 'failed';
      }
    },
    unreadAdded: (state, { payload }: PayloadAction<string>) => {
      state.unread[payload] = (state.unread[payload] ?? 0) + 1;
    },
    conversationRead: (state, { payload }: PayloadAction<string>) => {
      delete state.unread[payload];
    },
    conversationCleared: (state, { payload }: PayloadAction<string>) => {
      delete state.conversations[payload];
      delete state.unread[payload];
    },
  },
});

export const {
  addMessage,
  fileAdded,
  fileProgress,
  fileCompleted,
  fileFailed,
  unreadAdded,
  conversationRead,
  conversationCleared,
} = chatSlice.actions;

export const chatReducer = chatSlice.reducer;
