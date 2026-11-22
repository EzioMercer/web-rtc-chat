import type { Message } from '../../store/chat/types.ts';
import { kv, type KvWrite } from '../storage/kv.ts';
import { PAGE_FORMAT, PAGE_SIZE } from './config.ts';
import { ensureSlot } from './ensureSlot.ts';
import { historyKeys } from './historyKeys.ts';
import { sealJsonRecord } from './sealJsonRecord.ts';
import { slotListWrites } from './slotListWrites.ts';
import { toStored } from './toStored.ts';
import type { StoredPage } from './types.ts';

// The store never changes a message in place, so an unchanged page holds the very same objects as before.
const pageChanged = (before: Message[], now: Message[], page: number) => {
  const start = page * PAGE_SIZE;
  const end = Math.min(now.length, start + PAGE_SIZE);

  if (Math.min(before.length, start + PAGE_SIZE) !== end) {
    return true;
  }

  for (let i = start; i < end; i += 1) {
    if (before[i] !== now[i]) {
      return true;
    }
  }

  return false;
};

// Saves the pages of `chat` that differ from `before` (what was saved last), and drops pages it no longer has.
export const writePages = async (chat: string, before: Message[], now: Message[]) => {
  const slot = ensureSlot(chat);
  const pages = Math.ceil(now.length / PAGE_SIZE);
  const pagesBefore = Math.ceil(before.length / PAGE_SIZE);
  const writes: KvWrite[] = [];

  for (let page = 0; page < pages; page += 1) {
    if (pageChanged(before, now, page)) {
      const key = historyKeys.page(slot, page);
      const value: StoredPage = {
        format: PAGE_FORMAT,
        messages: now.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(toStored),
      };

      writes.push({ key, value: await sealJsonRecord(key, value) });
    }
  }

  for (let page = pages; page < pagesBefore; page += 1) {
    writes.push({ key: historyKeys.page(slot, page) });
  }

  const list = await slotListWrites();

  if (writes.length || list.writes.length) {
    await kv.batch([...writes, ...list.writes]);
    list.done();
  }
};
