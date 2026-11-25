import type { Unread } from '../../store/chat/types.ts';
import { kv } from '../storage/kv.ts';
import { historyKeys } from './historyKeys.ts';
import { historySaver } from './historySaver.ts';
import { isSaving } from './isSaving.ts';
import { sealJsonRecord } from './sealJsonRecord.ts';

// Saves what is unread in each chat, so it still shows after a reload.
export const saveUnread = (unread: Record<string, Unread>) => historySaver.run(async () => {
  if (isSaving()) {
    await kv.set(historyKeys.unread, await sealJsonRecord(historyKeys.unread, unread));
  }
});
