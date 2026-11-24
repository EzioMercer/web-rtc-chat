import { kv } from '../storage/kv.ts';
import { fileWrites } from './fileWrites.ts';
import { historyKeys } from './historyKeys.ts';
import { isSaving } from './isSaving.ts';
import { slots } from './slots.ts';

// Deletes a file's saved content (its message was deleted). If the tab closes first, what is left belongs to no
// message and is removed at the next unlock (see loadHistory).
export const deleteFileBytes = (chat: string, id: string): Promise<void> => fileWrites(async () => {
  const slot = slots.map.get(chat);

  if (slot && isSaving()) {
    await kv.deletePrefix(historyKeys.chunksOf(slot, id));
  }
});
