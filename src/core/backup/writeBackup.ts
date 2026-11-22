import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { unseal } from '../crypto/unseal.ts';
import { isCompressible } from '../compression/isCompressible.ts';
import { MIN_FILE_SAVING } from '../compression/config.ts';
import { FILE_CHUNK, PAGE_SIZE } from '../history/config.ts';
import { readFileChunk } from '../history/readFileChunk.ts';
import { toStored } from '../history/toStored.ts';
import { contactKeys } from '../identity/contactKeys.ts';
import { vault } from '../identity/vault.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { type Message, FileStatus, MessageKind } from '../../store/chat/types.ts';
import type { ByteSink } from './ByteSink.ts';
import { savedFiles } from './savedFiles.ts';
import { LEFT_OUT } from './config.ts';
import { createBackupWriter } from './createBackupWriter.ts';
import { RecordType } from './RecordType.ts';
import type { BackupInfo, ChatChoice, ContactRecord, FileRecord, PageRecord } from './types.ts';
import { zipBytes } from './zipBytes.ts';

export type BackupSource = {
  contacts: Contact[];
  conversations: Record<string, Message[]>;
  // The chats to back up, in order, and whether with media.
  choices: ChatChoice[];
};

const MISSING = 'Not in the backup (it was missing on the device it came from).';

const ourKey = async (id: string) => {
  const key = contactKeys.get(id);

  if (!key || !vault.vaultKey) {
    return null;
  }

  const pkcs8 = await unseal(vault.vaultKey, key.sealed);
  const b64 = bytesToB64(pkcs8);

  pkcs8.fill(0);

  return b64;
};

// Writes a backup of the chosen chats to `sink`: an Info record, every chosen contact, then each chat's files
// (if chosen) and its messages. Files go first so their messages can say when one was missing. Text and
// text-like files are zipped before encryption. Reports progress as bytes done of `backupWork`.
export const writeBackup = async (
  sink: ByteSink,
  password: string,
  source: BackupSource,
  onProgress: (done: number) => void,
  signal: AbortSignal,
) => {
  const writer = await createBackupWriter(sink, password);
  const chosen = source.choices.filter(({ id }) => source.contacts.some(contact => contact.id === id));
  let done = 0;

  const info: BackupInfo = {
    createdAt: Date.now(),
    chats: chosen.map(({ id, media }) => {
      const messages = source.conversations[id] ?? [];

      return {
        id,
        name: source.contacts.find(contact => contact.id === id)?.name ?? '',
        messages: messages.length,
        media,
        mediaBytes: media ? savedFiles(messages).reduce((total, file) => total + file.size, 0) : 0,
      };
    }),
  };

  await writer.json(RecordType.Info, info);

  for (const { id } of chosen) {
    const contact = source.contacts.find(c => c.id === id) as Contact;
    const record: ContactRecord = { contact, key: await ourKey(id) };

    await writer.json(RecordType.Contact, record);
  }

  for (const { id: chat, media } of chosen) {
    const messages = source.conversations[chat] ?? [];
    const missing = new Set<string>();

    for (const file of media ? savedFiles(messages) : []) {
      const count = Math.ceil(file.size / FILE_CHUNK);
      let first: Uint8Array<ArrayBuffer>;

      signal.throwIfAborted();

      try {
        first = count ? await readFileChunk(chat, file.id, 0) : new Uint8Array();
      } catch {
        missing.add(file.id);
        done += file.size;
        continue;
      }

      const record: FileRecord = { chat, id: file.id, size: file.size };
      const zip = isCompressible(new File([], file.name, { type: file.mime }));

      await writer.json(RecordType.File, record);

      for (let n = 0; n < count; n += 1) {
        const piece = n === 0 ? first : await readFileChunk(chat, file.id, n);
        const zipped = zip ? await zipBytes(piece) : null;

        signal.throwIfAborted();

        if (zipped && zipped.length <= piece.length * (1 - MIN_FILE_SAVING)) {
          await writer.record(RecordType.ZippedChunk, zipped);
        } else {
          await writer.record(RecordType.Chunk, piece);
        }

        done += piece.length;
        onProgress(done);
      }
    }

    const stored = messages.map((message) => {
      const saved = toStored(message);

      if (saved.kind !== MessageKind.File || saved.status !== FileStatus.Done || (media && !missing.has(saved.id))) {
        return saved;
      }

      return { ...saved, status: FileStatus.Failed, error: media ? MISSING : LEFT_OUT };
    });

    for (let start = 0; start < stored.length; start += PAGE_SIZE) {
      const page: PageRecord = { chat, messages: stored.slice(start, start + PAGE_SIZE) };

      signal.throwIfAborted();
      await writer.json(RecordType.Page, page);
    }

    done += JSON.stringify(stored).length;
    onProgress(done);
  }

  await writer.json(RecordType.End, { records: writer.count() });
  await sink.close();
};
