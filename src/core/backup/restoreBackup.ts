import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import { seal } from '../crypto/seal.ts';
import { FILE_CHUNK, PAGE_FORMAT, PAGE_SIZE } from '../history/config.ts';
import { fromStored } from '../history/fromStored.ts';
import { historyKeys } from '../history/historyKeys.ts';
import { isSaving } from '../history/isSaving.ts';
import { memoryFileKey } from '../history/memoryFileKey.ts';
import { memoryFiles } from '../history/memoryFiles.ts';
import { sealJsonRecord } from '../history/sealJsonRecord.ts';
import { sealRecord } from '../history/sealRecord.ts';
import { slots } from '../history/slots.ts';
import type { StoredMessage, StoredPage } from '../history/types.ts';
import { contactKeys } from '../identity/contactKeys.ts';
import { contactsWrites } from '../identity/contactsWrites.ts';
import { importSigningKey } from '../identity/importSigningKey.ts';
import { STORAGE_KEYS } from '../identity/storageKeys.ts';
import type { ContactKey } from '../identity/types.ts';
import { vault } from '../identity/vault.ts';
import { isPicture } from '../profile/isPicture.ts';
import { kv, type KvWrite } from '../storage/kv.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { type Message, FileStatus, MessageKind } from '../../store/chat/types.ts';
import { DAMAGED, LEFT_OUT, MAX_RECORD_BYTES } from './config.ts';
import { createRecordReader } from './createRecordReader.ts';
import { openBackup } from './openBackup.ts';
import { RecordType } from './RecordType.ts';
import type { BackupInfo, ContactRecord, FileRecord, PageRecord } from './types.ts';
import { unzipBytes } from './unzipBytes.ts';
import { validContact } from './validContact.ts';
import { validMessages } from './validMessages.ts';

export type RestorePlan = {
  // Backup chats to restore. A contact on this device with the same id is replaced by the backup's.
  include: Set<string>;
  // Restore files and voice/video messages too.
  media: boolean;
  // Contacts on this device to delete (their name clashed with one from the backup, and the backup's was kept).
  remove: Set<string>;
};

// Storage pieces written per transaction.
const CHUNKS_PER_WRITE = 4;

// A file being restored: its pieces arrive in Chunk records.
type Incoming = {
  chat: string;
  id: string;
  size: number;
  received: number;
  // Written to storage / kept in memory; neither when it is skipped.
  keep: boolean;
  slot: string;
  pending: Uint8Array<ArrayBuffer>[];
  pendingBytes: number;
  next: number;
  writes: KvWrite[];
  parts: Uint8Array<ArrayBuffer>[];
};

const flushWrites = async (file: Incoming) => {
  if (file.writes.length) {
    await kv.batch(file.writes);
    file.writes = [];
  }
};

// Cuts what arrived into storage pieces of FILE_CHUNK bytes (the backup's pieces may be another size).
const storePieces = async (file: Incoming, last: boolean) => {
  while (file.pendingBytes >= FILE_CHUNK || (last && file.pendingBytes > 0)) {
    const size = Math.min(FILE_CHUNK, file.pendingBytes);
    const piece = new Uint8Array(size);
    let filled = 0;

    while (filled < size) {
      const part = file.pending[0];
      const take = Math.min(part.length, size - filled);

      piece.set(part.subarray(0, take), filled);
      filled += take;
      file.pending[0] = part.subarray(take);

      if (!file.pending[0].length) {
        file.pending.shift();
      }
    }

    file.pendingBytes -= size;

    const key = historyKeys.chunk(file.slot, file.id, file.next);

    file.next += 1;
    file.writes.push({ key, value: await sealRecord(key, piece) });

    if (file.writes.length >= CHUNKS_PER_WRITE) {
      await flushWrites(file);
    }
  }

  if (last) {
    await flushWrites(file);
  }
};

// Puts the restored contacts into the list: same id replaces, new ones go at the end, `remove` goes away.
const mergeContacts = (current: Contact[], restored: Map<string, Contact>, remove: Set<string>) => {
  const merged = current.filter(contact => !remove.has(contact.id)).map(contact => restored.get(contact.id) ?? contact);

  restored.forEach((contact) => {
    if (!merged.some(c => c.id === contact.id)) {
      merged.push(contact);
    }
  });

  return merged;
};

const pageWrites = async (slot: string, messages: StoredMessage[]): Promise<KvWrite[]> => {
  const writes: KvWrite[] = [];

  for (let start = 0, page = 0; start < messages.length; start += PAGE_SIZE, page += 1) {
    const key = historyKeys.page(slot, page);
    const value: StoredPage = { format: PAGE_FORMAT, messages: messages.slice(start, start + PAGE_SIZE) };

    writes.push({ key, value: await sealJsonRecord(key, value) });
  }

  return writes;
};

// Restores the chosen chats from a backup (opened with readBackupPreview's `key`) into this identity: into storage,
// or into memory for a temporary one. The whole file is read and checked first; only then, in one write, the
// restored chats take the place of the old ones, so a damaged file or a closed tab changes nothing. Reports how many
// bytes of the file were read. Returns the new contact list, in memory the restored chats, and our picture from
// the backup.
export const restoreBackup = async (
  file: Blob,
  key: CryptoKey,
  plan: RestorePlan,
  current: { contacts: Contact[]; unread: Record<string, number> },
  onProgress: (read: number) => void,
  signal: AbortSignal,
) => {
  const toStorage = isSaving();
  const { reader } = await openBackup(file);
  const records = createRecordReader(reader, key);
  const contacts = new Map<string, Contact>();
  const keys = new Map<string, ContactKey>();
  const newSlots = new Map<string, string>();
  const messages = new Map<string, StoredMessage[]>();
  const restoredFiles = new Set<string>();
  // Restored files kept in memory (temporary identity), until the restore is complete.
  const blobs = new Map<string, Blob>();
  let incoming: Incoming | null = null;
  let ended = false;
  // Our picture, from the Info record.
  let picture: string | null = null;

  const finishFile = async () => {
    if (!incoming) {
      return;
    }

    const done: Incoming = incoming;

    incoming = null;

    if (done.received !== done.size) {
      throw new Error(DAMAGED);
    }

    if (!done.keep) {
      return;
    }

    if (toStorage) {
      await storePieces(done, true);
    } else {
      blobs.set(memoryFileKey(done.chat, done.id), new Blob(done.parts));
    }

    restoredFiles.add(memoryFileKey(done.chat, done.id));
  };

  const readContact = async (record: ContactRecord) => {
    if (!validContact(record.contact)) {
      throw new Error(DAMAGED);
    }

    const { contact } = record;

    if (!plan.include.has(contact.id)) {
      return;
    }

    contacts.set(contact.id, contact);
    messages.set(contact.id, []);
    newSlots.set(contact.id, bytesToB64(randomBytes(9)));

    if (record.key && vault.vaultKey) {
      const pkcs8 = b64ToBytes(record.key);

      keys.set(contact.id, {
        publicKey: contact.myKey,
        signingKey: await importSigningKey(pkcs8),
        sealed: await seal(vault.vaultKey, pkcs8),
      });
      pkcs8.fill(0);
    }
  };

  const startFile = (record: FileRecord) => {
    const { chat, id, size } = record;

    if (typeof id !== 'string' || !/^[\w.-]{1,70}$/.test(id) || !Number.isSafeInteger(size) || size < 0) {
      throw new Error(DAMAGED);
    }

    incoming = {
      chat,
      id,
      size,
      received: 0,
      keep: plan.media && contacts.has(chat),
      slot: newSlots.get(chat) ?? '',
      pending: [],
      pendingBytes: 0,
      next: 0,
      writes: [],
      parts: [],
    };
  };

  const addPiece = async (piece: Uint8Array<ArrayBuffer>) => {
    if (!incoming) {
      throw new Error(DAMAGED);
    }

    incoming.received += piece.length;

    if (incoming.received > incoming.size) {
      throw new Error(DAMAGED);
    }

    if (!incoming.keep) {
      return;
    }

    if (toStorage) {
      incoming.pending.push(piece);
      incoming.pendingBytes += piece.length;
      await storePieces(incoming, false);
    } else {
      incoming.parts.push(piece);
    }
  };

  try {
    while (!ended) {
      const { type, plain } = await records.next();

      signal.throwIfAborted();
      onProgress(reader.position());

      // The Info record comes first, and only there.
      if ((records.count() === 1) !== (type === RecordType.Info)) {
        throw new Error(DAMAGED);
      }

      if (type !== RecordType.Chunk && type !== RecordType.ZippedChunk) {
        await finishFile();
      }

      switch (type) {
        case RecordType.Info: {
          const info = await records.json<BackupInfo>(plain);

          picture = isPicture(info.picture) ? info.picture : null;
          break;
        }
        case RecordType.Contact:
          await readContact(await records.json<ContactRecord>(plain));
          break;
        case RecordType.File:
          startFile(await records.json<FileRecord>(plain));
          break;
        case RecordType.Chunk:
          await addPiece(plain);
          break;
        case RecordType.ZippedChunk:
          await addPiece(await unzipBytes(plain, MAX_RECORD_BYTES));
          break;
        case RecordType.Page: {
          const page = await records.json<PageRecord>(plain);

          messages.get(page.chat)?.push(...validMessages(page.messages));
          break;
        }
        case RecordType.End:
          // Nothing may follow the end.
          if (await reader.read(1)) {
            throw new Error(DAMAGED);
          }

          ended = true;
          break;
        default:
          throw new Error(DAMAGED);
      }
    }
  } catch (err) {
    reader.cancel();

    if (toStorage) {
      for (const slot of newSlots.values()) {
        await kv.deletePrefix(historyKeys.pagesOf(slot)).catch(() => undefined);
        await kv.deletePrefix(historyKeys.filesOf(slot)).catch(() => undefined);
      }
    }

    throw err;
  }

  // Files whose content isn't in the backup (or wasn't chosen) say so.
  const chats = new Map([...messages].map(([chat, list]) => [chat, list.map((message) => {
    const missing = message.kind === MessageKind.File && message.status === FileStatus.Done
      && !restoredFiles.has(memoryFileKey(chat, message.id));

    return missing ? { ...message, status: FileStatus.Failed, error: LEFT_OUT } : message;
  })]));

  // Commit: our keys, the contact list and the chats' slots switch over together.
  const replaced = new Set([...contacts.keys(), ...plan.remove]);
  const before = new Map([...replaced].map(id => [id, contactKeys.get(id)]));
  const merged = mergeContacts(current.contacts, contacts, plan.remove);

  // Files of the chats being replaced, still in memory, must not stand in for the restored ones.
  const dropMemoryFiles = () => [...memoryFiles.keys()]
    .filter(fileKey => replaced.has(fileKey.split('\n')[0]))
    .forEach(fileKey => memoryFiles.delete(fileKey));

  plan.remove.forEach(id => contactKeys.delete(id));
  contacts.forEach((_contact, id) => contactKeys.delete(id));
  keys.forEach((contactKey, id) => contactKeys.set(id, contactKey));

  if (!toStorage) {
    const conversations: Record<string, Message[]> = {};

    dropMemoryFiles();
    chats.forEach((list, chat) => {
      const restored = list.map(fromStored);

      // Memory files get their type from their message.
      restored.forEach((message) => {
        const fileKey = memoryFileKey(chat, message.id);
        const blob = blobs.get(fileKey);

        if (message.kind === MessageKind.File && blob) {
          memoryFiles.set(fileKey, new Blob([blob], { type: message.mime }));
        }
      });

      if (restored.length) {
        conversations[chat] = restored;
      }
    });

    return { contacts: merged, conversations, picture };
  }

  const oldSlots = [...replaced].map(id => slots.map.get(id)).filter((slot): slot is string => Boolean(slot));
  const slotMap = new Map([...slots.map].filter(([id]) => !replaced.has(id)));

  newSlots.forEach((slot, id) => slotMap.set(id, slot));

  try {
    for (const [chat, list] of chats) {
      await kv.batch(await pageWrites(newSlots.get(chat) as string, list));
    }

    const unread = Object.fromEntries(Object.entries(current.unread).filter(([id]) => !replaced.has(id)));

    await kv.batch([
      ...await contactsWrites(merged),
      { key: historyKeys.slots, value: await sealJsonRecord(historyKeys.slots, Object.fromEntries(slotMap)) },
      { key: historyKeys.unread, value: await sealJsonRecord(historyKeys.unread, unread) },
      // A new identity (restoring on the setup screen) becomes real only now.
      ...(vault.meta ? [{ key: STORAGE_KEYS.meta, value: vault.meta }] : []),
    ]);
  } catch (err) {
    before.forEach((contactKey, id) => (contactKey ? contactKeys.set(id, contactKey) : contactKeys.delete(id)));

    for (const slot of newSlots.values()) {
      await kv.deletePrefix(historyKeys.pagesOf(slot)).catch(() => undefined);
      await kv.deletePrefix(historyKeys.filesOf(slot)).catch(() => undefined);
    }

    throw err;
  }

  slots.map = slotMap;
  dropMemoryFiles();

  for (const slot of oldSlots) {
    await kv.deletePrefix(historyKeys.pagesOf(slot));
    await kv.deletePrefix(historyKeys.filesOf(slot));
  }

  return { contacts: merged, conversations: {}, picture };
};
