import type { Message } from '../../store/chat/types.ts';
import { SAVE_DELAY_MS } from './config.ts';
import { isSaving } from './isSaving.ts';
import { writePages } from './writePages.ts';

type Read = () => Message[] | undefined;

// What each chat looked like when it was last saved (the store's own arrays: unchanged messages are the same
// objects, see writePages).
const saved = new Map<string, Message[]>();
const timers = new Map<string, { timer: number; read: Read }>();
let queue: Promise<unknown> = Promise.resolve();

let onError: (chat: string, err: unknown) => void = () => undefined;

// Writes run one after another, in the order they were asked for.
const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
  const next = queue.then(job);

  queue = next.catch(() => undefined);

  return next;
};

const save = (chat: string, read: Read) => enqueue(async () => {
  const now = read() ?? [];
  const before = saved.get(chat) ?? [];

  if (!isSaving() || now === before) {
    return;
  }

  try {
    await writePages(chat, before, now);
    saved.set(chat, now);
  } catch (err) {
    onError(chat, err);
  }
});

// Saves chats a moment after they change (see SAVE_DELAY_MS). Everything goes through one queue, so writes never
// overtake each other.
export const historySaver = {
  // Called when a save fails, e.g. because the device is full.
  setErrorHandler: (handler: typeof onError) => {
    onError = handler;
  },
  // `read` gives the chat's messages as they are when the save runs.
  schedule: (chat: string, read: Read) => {
    const pending = timers.get(chat);

    if (pending) {
      pending.read = read;

      return;
    }

    const timer = window.setTimeout(() => {
      const entry = timers.get(chat);

      timers.delete(chat);

      if (entry) {
        void save(chat, entry.read);
      }
    }, SAVE_DELAY_MS);

    timers.set(chat, { timer, read });
  },
  // Saves everything that is waiting now, and resolves when all writes are done.
  flush: (): Promise<void> => {
    timers.forEach(({ timer, read }, chat) => {
      window.clearTimeout(timer);
      void save(chat, read);
    });
    timers.clear();

    return enqueue(() => Promise.resolve());
  },
  // Runs `job` in the queue, after the writes asked for before it.
  run: enqueue,
  // These chats are now saved as they are (just loaded, or written by a backup restore).
  loaded: (chats: Record<string, Message[]>) => {
    Object.entries(chats).forEach(([chat, messages]) => saved.set(chat, messages));
  },
  // Stops saving `chat` (it is being deleted).
  forget: (chat: string) => {
    const pending = timers.get(chat);

    if (pending) {
      window.clearTimeout(pending.timer);
      timers.delete(chat);
    }

    saved.delete(chat);
  },
  // Forgets everything (a different identity, or everything is saved again from scratch).
  reset: () => {
    timers.forEach(({ timer }) => window.clearTimeout(timer));
    timers.clear();
    saved.clear();
  },
};
