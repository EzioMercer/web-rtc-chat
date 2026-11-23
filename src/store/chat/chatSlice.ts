import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import {
  type ChatState,
  type FileMessage,
  FileStatus,
  type LocationMessage,
  type Message,
  MessageAuthor,
  MessageKind,
  type TextMessage,
} from './types.ts';

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
  (message): message is FileMessage => message.kind === MessageKind.File && message.id === id,
);

const findLocation = (state: ChatState, key: string, id: string) => state.conversations[key]?.find(
  (message): message is LocationMessage => message.kind === MessageKind.Location && message.id === id,
);

type Keyed<T> = { key: string } & T;

// What changes on a location already in the chat (a live one moving, stopping, or being confirmed).
type LocationChange = Partial<Pick<LocationMessage, 'lat' | 'lng' | 'accuracy' | 'liveUntil' | 'updatedAt' | 'rev'
  | 'pending'>>;

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: {
      reducer: (state, { payload }: PayloadAction<Keyed<{ message: TextMessage }>>) => {
        push(state, payload.key, payload.message);
      },
      prepare: ({ key, from, text }: Keyed<Pick<TextMessage, 'from' | 'text'>>) => ({
        payload: { key, message: { kind: MessageKind.Text as const, id: nanoid(), from, text } },
      }),
    },
    // Their text, written `at` (already converted to our clock). `id` is theirs (see peerMessageId).
    peerTextReceived: (state, { payload }: PayloadAction<Keyed<{ id: string; text: string; at: number }>>) => {
      const { key, id, text, at } = payload;

      insertByTime(state, key, { kind: MessageKind.Text, id, from: MessageAuthor.Peer, text, at });
    },
    messageQueued: (state, { payload }: PayloadAction<Keyed<{ id: string; text: string }>>) => {
      const { key, id, text } = payload;

      push(state, key, { kind: MessageKind.Text, id, from: MessageAuthor.Me, text, pending: true });
    },
    // `rev`: which change of a live location they confirm; an older one leaves a newer change waiting.
    messageDelivered: (state, { payload }: PayloadAction<Keyed<{ id: string; rev?: number }>>) => {
      const message = state.conversations[payload.key]?.find(m => m.id === payload.id);

      if (message?.kind === MessageKind.Text
        || (message?.kind === MessageKind.Location && (message.rev ?? 0) === (payload.rev ?? 0))) {
        delete message.pending;
      }
    },
    // Ours, waiting to be confirmed like a text.
    locationAdded: (state, { payload }: PayloadAction<Keyed<{ message: LocationMessage }>>) => {
      push(state, payload.key, payload.message);
    },
    // Theirs, put where its time belongs like a text. `id` is theirs (see peerMessageId).
    peerLocationReceived: (state, { payload }: PayloadAction<Keyed<{ message: LocationMessage & { at: number } }>>) => {
      insertByTime(state, payload.key, payload.message);
    },
    locationChanged: (state, { payload }: PayloadAction<Keyed<{ id: string; change: LocationChange }>>) => {
      const location = findLocation(state, payload.key, payload.id);

      if (location) {
        Object.assign(location, payload.change);

        if (payload.change.pending === false) {
          delete location.pending;
        }
      }
    },
    fileAdded: (state, { payload }: PayloadAction<Keyed<{ file: Omit<FileMessage, 'kind'> }>>) => {
      push(state, payload.key, { ...payload.file, kind: MessageKind.File });
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
        file.status = FileStatus.Done;
      }
    },
    fileFailed: (state, { payload }: PayloadAction<Keyed<{ id: string; error?: string }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.status = FileStatus.Failed;
        file.error = payload.error;
      }
    },
    unreadAdded: (state, { payload }: PayloadAction<string>) => {
      state.unread[payload] = (state.unread[payload] ?? 0) + 1;
    },
    conversationRead: (state, { payload }: PayloadAction<string>) => {
      delete state.unread[payload];
    },
    // The saved chats, after unlocking or restoring a backup. Replaces what was in memory.
    historyLoaded: (state, { payload }: PayloadAction<ChatState>) => {
      state.conversations = payload.conversations;
      state.unread = payload.unread;
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
  locationAdded,
  peerLocationReceived,
  locationChanged,
  fileAdded,
  fileProgress,
  fileCompleted,
  fileFailed,
  unreadAdded,
  conversationRead,
  historyLoaded,
  conversationCleared,
} = chatSlice.actions;

export const chatReducer = chatSlice.reducer;
