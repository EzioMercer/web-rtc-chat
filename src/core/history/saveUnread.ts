import { kv } from '../storage/kv.ts';
import { historyKeys } from './historyKeys.ts';
import { historySaver } from './historySaver.ts';
import { isSaving } from './isSaving.ts';
import { sealJsonRecord } from './sealJsonRecord.ts';

// Saves how many unread messages each chat has, so they still show after a reload.
export const saveUnread = (unread: Record<string, number>) => historySaver.run(async () => {
  if (isSaving()) {
    await kv.set(historyKeys.unread, await sealJsonRecord(historyKeys.unread, unread));
  }
});
