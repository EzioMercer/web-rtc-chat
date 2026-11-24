import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { MARKER_MARGIN_MS, RESEND_MS } from '../../core/webrtc/config.ts';
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

type Linked = TextMessage | FileMessage | LocationMessage;

// Messages that can answer or be answered (a deleted one's marker, or a kind this version doesn't know, can't).
const linkable = (message: Message | undefined): message is Linked => message?.kind === MessageKind.Text
  || message?.kind === MessageKind.File || message?.kind === MessageKind.Location;

// A message about to join `list`: if it answers one, that one learns of it; if that one isn't here (deleted, or it
// never came), it joins as a normal message.
const linked = <T extends Message>(list: Message[], message: T): T => {
  if (!linkable(message) || message.replyTo === undefined) {
    return message;
  }

  const original = list.find(m => m.id === message.replyTo);

  if (!linkable(original) || original.id === message.id) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { replyTo, ...rest } = message;

    return rest as T;
  }

  if (!original.replies?.includes(message.id)) {
    original.replies = [...(original.replies ?? []), message.id];
  }

  return message;
};

// A message leaving `list`: its replies become normal messages, and the one it answers forgets it.
const unlink = (list: Message[], message: Message) => {
  if (!linkable(message)) {
    return;
  }

  const replies = new Set(message.replies);

  list.forEach((other) => {
    if (!linkable(other)) {
      return;
    }

    if (replies.has(other.id) && other.replyTo === message.id) {
      delete other.replyTo;
    }

    if (other.id === message.replyTo && other.replies) {
      other.replies = other.replies.filter(id => id !== message.id);

      if (!other.replies.length) {
        delete other.replies;
      }
    }
  });
};

const push = (state: ChatState, key: string, message: Message) => {
  const list = (state.conversations[key] ??= []);

  list.push(linked(list, { ...message, at: message.at ?? Date.now() }));
};

// Puts a message where its time belongs. Only messages that waited (written while the connection was down) move
// up, and only past the few newer ones, so a live chat is never re-sorted.
const insertByTime = (state: ChatState, key: string, message: Message & { at: number }) => {
  const list = (state.conversations[key] ??= []);
  let index = list.length;

  while (index > 0 && (list[index - 1].at ?? 0) > message.at) {
    index -= 1;
  }

  list.splice(index, 0, linked(list, message));
};

const findFile = (state: ChatState, key: string, id: string) => state.conversations[key]?.find(
  (message): message is FileMessage => message.kind === MessageKind.File && message.id === id,
);

const findLocation = (state: ChatState, key: string, id: string) => state.conversations[key]?.find(
  (message): message is LocationMessage => message.kind === MessageKind.Location && message.id === id,
);

type Keyed<T> = { key: string } & T;

// A file of ours that wasn't confirmed within RESEND_MS.
const NOT_SENT = 'Not sent.';

// Ours, still sent again when the connection opens (a live location has its own end).
const resending = (message: Message, now: number) => message.from === MessageAuthor.Me
  && (message.at ?? now) + RESEND_MS > now;

// When a marker for their deleted message can go: their last try (RESEND_MS after they wrote it, or a live
// location's end) has passed.
const markerEnd = (message: Message, now: number) => Math.max(
  (message.at ?? now) + RESEND_MS,
  message.kind === MessageKind.Location ? message.liveUntil ?? 0 : 0,
  now,
) + MARKER_MARGIN_MS;

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
    // Their text, written `at` (already converted to our clock). `id` is theirs (see peerMessageId); `replyTo` is
    // in our chat's terms (see parseReplyTo).
    peerTextReceived: (
      state,
      { payload }: PayloadAction<Keyed<{ id: string; text: string; at: number; replyTo?: string }>>,
    ) => {
      const { key, id, text, at, replyTo } = payload;

      insertByTime(state, key, {
        kind: MessageKind.Text,
        id,
        from: MessageAuthor.Peer,
        text,
        at,
        ...(replyTo === undefined ? {} : { replyTo }),
      });
    },
    messageQueued: (state, { payload }: PayloadAction<Keyed<{ id: string; text: string; replyTo?: string }>>) => {
      const { key, id, text, replyTo } = payload;

      push(state, key, {
        kind: MessageKind.Text,
        id,
        from: MessageAuthor.Me,
        text,
        pending: true,
        ...(replyTo === undefined ? {} : { replyTo }),
      });
    },
    // The open connection took these (texts and locations of ours): they are on their way.
    messagesSent: (state, { payload }: PayloadAction<Keyed<{ ids: string[] }>>) => {
      const ids = new Set(payload.ids);

      state.conversations[payload.key]?.forEach((message) => {
        if ((message.kind === MessageKind.Text || message.kind === MessageKind.Location) && message.pending
          && ids.has(message.id)) {
          message.sent = true;
          message.tried = true;
        }
      });
    },
    // The connection closed: what it took but they didn't confirm may not have arrived, so it waits again.
    connectionLost: (state, { payload }: PayloadAction<string>) => {
      state.conversations[payload]?.forEach((message) => {
        if ((message.kind === MessageKind.Text || message.kind === MessageKind.Location) && message.sent) {
          delete message.sent;
        }
      });
    },
    // `rev`: which change of a live location they confirm; an older one leaves a newer change waiting. A marker
    // kept only to send our live location's stop goes once they confirm the stop.
    messageDelivered: (state, { payload }: PayloadAction<Keyed<{ id: string; rev?: number }>>) => {
      const list = state.conversations[payload.key];
      const index = list?.findIndex(m => m.id === payload.id) ?? -1;
      const message = list?.[index];
      const rev = payload.rev ?? 0;

      if (message?.kind === MessageKind.Text
        || (message?.kind === MessageKind.Location && (message.rev ?? 0) === rev)) {
        delete message.pending;
        delete message.sent;
        delete message.tried;
        delete message.unsent;
      }

      if (message?.kind === MessageKind.Deleted && message.stop && (message.stop.rev ?? 0) === rev) {
        list?.splice(index, 1);
      }
    },
    // Send again, after it was given up (see RESEND_MS): it goes to the end, as written now.
    messageMovedToEnd: (state, { payload }: PayloadAction<Keyed<{ id: string }>>) => {
      const list = state.conversations[payload.key];
      const index = list?.findIndex(m => m.id === payload.id) ?? -1;
      const message = list?.[index];

      if (!list || !message || message.from !== MessageAuthor.Me) {
        return;
      }

      list.splice(index, 1);

      if (message.kind === MessageKind.Text || message.kind === MessageKind.Location) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sent, unsent, ...rest } = message;

        list.push({ ...rest, at: Date.now(), pending: true });
      } else if (message.kind === MessageKind.File) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { error, ...rest } = message;

        list.push({ ...rest, at: Date.now(), status: FileStatus.Waiting, transferred: 0 });
      }
    },
    // Ours that waited longer than RESEND_MS are no longer sent by themselves, and markers whose time is up go.
    messagesExpired: (state, { payload: now }: PayloadAction<number>) => {
      Object.values(state.conversations).forEach((list) => {
        for (let i = list.length - 1; i >= 0; i -= 1) {
          const message = list[i];
          const givenUp = message.from === MessageAuthor.Me && !resending(message, now);
          const once = message.kind === MessageKind.Text
            || (message.kind === MessageKind.Location && message.liveUntil === undefined);

          if (message.kind === MessageKind.Deleted && message.until <= now) {
            list.splice(i, 1);
          } else if (givenUp && once && message.pending && !message.unsent) {
            message.unsent = true;
            delete message.sent;
          } else if (givenUp && message.kind === MessageKind.File && message.status === FileStatus.Waiting) {
            message.status = FileStatus.Failed;
            message.error = NOT_SENT;
          }
        }
      });
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

        // A new change of ours hasn't gone anywhere yet.
        if (payload.change.pending === true) {
          delete location.sent;
        }
      }
    },
    // Theirs with `at` (it waited on their side) goes where its time belongs, like a text.
    fileAdded: (state, { payload }: PayloadAction<Keyed<{ file: Omit<FileMessage, 'kind'> }>>) => {
      const { at } = payload.file;

      if (at === undefined) {
        push(state, payload.key, { ...payload.file, kind: MessageKind.File });
      } else {
        insertByTime(state, payload.key, { ...payload.file, kind: MessageKind.File, at });
      }
    },
    // It goes again from the start: ours sent again, or theirs coming again after it broke.
    fileRestarted: (state, { payload }: PayloadAction<Keyed<{ id: string; packed?: number }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.status = FileStatus.Transferring;
        file.transferred = 0;
        delete file.error;
        delete file.packed;

        if (payload.packed !== undefined) {
          file.packed = payload.packed;
        }
      }
    },
    // Ours: the connection broke during the transfer, so it goes again when one opens.
    fileWaiting: (state, { payload }: PayloadAction<Keyed<{ id: string }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.status = FileStatus.Waiting;
        file.transferred = 0;
        file.tried = true;
      }
    },
    fileProgress: (state, { payload }: PayloadAction<Keyed<{ id: string; transferred: number }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.transferred = payload.transferred;
      }
    },
    // `url`: null for one of ours that is only saved (sent again after a reload): it opens from storage.
    fileCompleted: (state, { payload }: PayloadAction<Keyed<{ id: string; url: string | null }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.url = payload.url;
        file.transferred = file.size;
        file.status = FileStatus.Done;
        delete file.tried;
      }
    },
    fileFailed: (state, { payload }: PayloadAction<Keyed<{ id: string; error?: string }>>) => {
      const file = findFile(state, payload.key, payload.id);

      if (file) {
        file.status = FileStatus.Failed;
        file.error = payload.error;
      }
    },
    // Deleted on this device only. Theirs leaves a marker for a while (see DeletedMessage); ours goes completely,
    // except a live location whose stop isn't confirmed yet: it waits to be sent until `stopUntil` (when it would
    // have ended anyway). Its replies become normal messages, here only (see unlink).
    messageDeleted: (state, { payload }: PayloadAction<Keyed<{ id: string; stopUntil?: number }>>) => {
      const list = state.conversations[payload.key];
      const index = list?.findIndex(message => message.id === payload.id) ?? -1;
      const message = list?.[index];
      const now = Date.now();

      if (!list || !message || message.kind === MessageKind.Deleted) {
        return;
      }

      const { id, from, at } = message;

      unlink(list, message);

      if (from === MessageAuthor.Peer) {
        list[index] = { kind: MessageKind.Deleted, id, from, at, until: markerEnd(message, now) };
      } else if (message.kind === MessageKind.Location && message.pending && payload.stopUntil) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { replyTo, replies, ...stop } = message;

        list[index] = { kind: MessageKind.Deleted, id, from, at, until: payload.stopUntil, stop };
      } else {
        list.splice(index, 1);
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
  messagesSent,
  connectionLost,
  messageDelivered,
  messageMovedToEnd,
  messagesExpired,
  locationAdded,
  peerLocationReceived,
  locationChanged,
  fileAdded,
  fileRestarted,
  fileWaiting,
  fileProgress,
  fileCompleted,
  fileFailed,
  messageDeleted,
  unreadAdded,
  conversationRead,
  historyLoaded,
  conversationCleared,
} = chatSlice.actions;

export const chatReducer = chatSlice.reducer;
