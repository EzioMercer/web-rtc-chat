import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatState, FileMessage, Message, TextMessage } from './types.ts';

const initialState: ChatState = {
  conversations: {},
  unread: {},
};

const push = (state: ChatState, key: string, message: Message) => {
  (state.conversations[key] ??= []).push({ ...message, at: message.at ?? Date.now() });
};

// Puts a message where its time belongs. Only messages that waited (written while the connection was down) move
// up, and only past the few newer ones, so a live chat is never re-sorted.
const insertByTime = (state: ChatState, key: string, message: Message & { at: number }) => {
  const list = (state.conversations[key] ??= []);
  let index = list.length;

  while (index > 0 && (list[index - 1].at ?? 0) > message.at) {
    index -= 1;
  }

  list.splice(index, 0, message);
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
    // Their text, written `at` (already converted to our clock).
    peerTextReceived: (state, { payload }: PayloadAction<Keyed<{ text: string; at: number }>>) => {
      const { key, text, at } = payload;

      insertByTime(state, key, { kind: 'text', id: nanoid(), from: 'peer', text, at });
    },
    messageQueued: (state, { payload }: PayloadAction<Keyed<{ id: string; text: string }>>) => {
      push(state, payload.key, { kind: 'text', id: payload.id, from: 'me', text: payload.text, pending: true });
    },
    messageDelivered: (state, { payload }: PayloadAction<Keyed<{ id: string }>>) => {
      const message = state.conversations[payload.key]?.find(m => m.id === payload.id);

      if (message?.kind === 'text') {
        delete message.pending;
      }
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
  peerTextReceived,
  messageQueued,
  messageDelivered,
  fileAdded,
  fileProgress,
  fileCompleted,
  fileFailed,
  unreadAdded,
  conversationRead,
  conversationCleared,
} = chatSlice.actions;

export const chatReducer = chatSlice.reducer;
