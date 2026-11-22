import type { KvWrite } from '../storage/kv.ts';
import { historyKeys } from './historyKeys.ts';
import { sealJsonRecord } from './sealJsonRecord.ts';
import { slots } from './slots.ts';

// The slot list, if it changed since it was saved, to be written together with the pages or file that need it.
// `done` marks it saved once that write went through.
export const slotListWrites = async (): Promise<{ writes: KvWrite[]; done: () => void }> => {
  const version = slots.version;

  if (version === slots.saved) {
    return { writes: [], done: () => undefined };
  }

  const value = await sealJsonRecord(historyKeys.slots, Object.fromEntries(slots.map));

  return {
    writes: [{ key: historyKeys.slots, value }],
    done: () => {
      slots.saved = Math.max(slots.saved, version);
    },
  };
};
