import { kv } from '../storage/kv.ts';
import { historyKeys } from './historyKeys.ts';
import { historySaver } from './historySaver.ts';
import { isSaving } from './isSaving.ts';
import { memoryFiles } from './memoryFiles.ts';
import { memoryFileKey } from './memoryFileKey.ts';
import { slotListWrites } from './slotListWrites.ts';
import { slots } from './slots.ts';

// Deletes `chat`'s saved messages and files. The slot list is written first: if the tab closes before the rest is
// deleted, what is left belongs to no one and is removed at the next unlock (see loadHistory).
export const deleteChat = (chat: string): Promise<void> => {
  const slot = slots.map.get(chat);

  historySaver.forget(chat);
  [...memoryFiles.keys()]
    .filter(key => key.startsWith(memoryFileKey(chat, '')))
    .forEach(key => memoryFiles.delete(key));

  if (!slot) {
    return Promise.resolve();
  }

  slots.map.delete(chat);
  slots.version += 1;

  return historySaver.run(async () => {
    if (!isSaving()) {
      return;
    }

    const list = await slotListWrites();

    await kv.batch(list.writes);
    list.done();
    await kv.deletePrefix(historyKeys.pagesOf(slot));
    await kv.deletePrefix(historyKeys.filesOf(slot));
  });
};
