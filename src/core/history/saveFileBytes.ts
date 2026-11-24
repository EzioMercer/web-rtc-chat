import { kv } from '../storage/kv.ts';
import { FILE_CHUNK } from './config.ts';
import { ensureSlot } from './ensureSlot.ts';
import { fileWrites } from './fileWrites.ts';
import { historyKeys } from './historyKeys.ts';
import { isSaving } from './isSaving.ts';
import { sealRecord } from './sealRecord.ts';
import { slotListWrites } from './slotListWrites.ts';
import { slots } from './slots.ts';

// Pieces written per transaction: big enough to be quick, small enough not to hold much memory.
const CHUNKS_PER_WRITE = 4;

const write = async (chat: string, id: string, blob: Blob) => {
  const slot = ensureSlot(chat);
  const count = Math.ceil(blob.size / FILE_CHUNK);

  for (let first = 0; first < count; first += CHUNKS_PER_WRITE) {
    // The chat was deleted or replaced meanwhile.
    if (slots.map.get(chat) !== slot || !isSaving()) {
      return;
    }

    const writes = [];

    for (let n = first; n < Math.min(count, first + CHUNKS_PER_WRITE); n += 1) {
      const key = historyKeys.chunk(slot, id, n);
      const bytes = await blob.slice(n * FILE_CHUNK, (n + 1) * FILE_CHUNK).arrayBuffer();

      writes.push({ key, value: await sealRecord(key, bytes) });
    }

    const list = await slotListWrites();

    await kv.batch([...writes, ...list.writes]);
    list.done();
  }
};

// Saves a file's content, encrypted piece by piece, one file at a time. Resolves when it is written.
export const saveFileBytes = (chat: string, id: string, blob: Blob): Promise<void> => {
  if (!isSaving()) {
    return Promise.resolve();
  }

  return fileWrites(() => write(chat, id, blob));
};
