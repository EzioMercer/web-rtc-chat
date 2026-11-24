import { type Message, MessageKind } from '../../store/chat/types.ts';
import { kv } from '../storage/kv.ts';
import { fromStored } from './fromStored.ts';
import { historyKeys } from './historyKeys.ts';
import { openJsonRecord } from './openJsonRecord.ts';
import { slots } from './slots.ts';
import type { StoredPage } from './types.ts';

type History = {
  conversations: Record<string, Message[]>;
  unread: Record<string, number>;
};

// Deletes what belongs to no chat (left over when the tab closed while a chat was deleted or replaced), and the
// pieces of files that belong to no message (a message deleted, or a file not yet in a saved page, when it closed).
const removeLeftovers = async (conversations: Record<string, Message[]>) => {
  const known = new Set(slots.map.values());
  const pageKeys = await kv.keys(historyKeys.pages);
  const fileKeys = await kv.keys(historyKeys.files);
  const orphans = new Set([...pageKeys, ...fileKeys].map(historyKeys.slotOf).filter(slot => !known.has(slot)));

  for (const slot of orphans) {
    await kv.deletePrefix(historyKeys.pagesOf(slot));
    await kv.deletePrefix(historyKeys.filesOf(slot));
  }

  for (const [chat, slot] of slots.map) {
    const files = new Set((conversations[chat] ?? []).filter(m => m.kind === MessageKind.File).map(m => m.id));
    const gone = new Set(fileKeys.filter(key => historyKeys.slotOf(key) === slot).map(historyKeys.fileOf)
      .filter(id => !files.has(id)));

    for (const id of gone) {
      await kv.deletePrefix(historyKeys.chunksOf(slot, id));
    }
  }
};

// Reads the saved chats of `contacts` (a page that can't be read is skipped). Must run once the vault is unlocked.
export const loadHistory = async (contacts: string[]): Promise<History> => {
  const sealedSlots = await kv.get<Uint8Array<ArrayBuffer>>(historyKeys.slots);
  const sealedUnread = await kv.get<Uint8Array<ArrayBuffer>>(historyKeys.unread);
  const saved = sealedSlots ? await openJsonRecord<Record<string, string>>(historyKeys.slots, sealedSlots) : {};
  const wanted = new Set(contacts);

  slots.map = new Map(Object.entries(saved).filter(([chat]) => wanted.has(chat)));
  slots.version = 0;
  slots.saved = slots.map.size === Object.keys(saved).length ? 0 : -1;

  const conversations: Record<string, Message[]> = {};

  for (const [chat, slot] of slots.map) {
    const pages = await kv.entries<Uint8Array<ArrayBuffer>>(historyKeys.pagesOf(slot));
    const messages: Message[] = [];

    for (const [key, sealed] of pages) {
      try {
        const page = await openJsonRecord<StoredPage>(key, sealed);

        messages.push(...page.messages.map(fromStored));
      } catch (err) {
        console.error('A saved page could not be read', err);
      }
    }

    if (messages.length) {
      conversations[chat] = messages;
    }
  }

  const unread = sealedUnread
    ? await openJsonRecord<Record<string, number>>(historyKeys.unread, sealedUnread).catch(() => null) ?? {}
    : {};

  await removeLeftovers(conversations);

  return {
    conversations,
    unread: Object.fromEntries(Object.entries(unread).filter(([chat]) => wanted.has(chat) && conversations[chat])),
  };
};
