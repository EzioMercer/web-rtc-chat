import { DAMAGED } from './config.ts';
import { createRecordReader } from './createRecordReader.ts';
import { openBackup } from './openBackup.ts';
import { RecordType } from './RecordType.ts';
import type { BackupInfo, ContactRecord } from './types.ts';
import { unlockBackupKey } from './unlockBackupKey.ts';
import { validContact } from './validContact.ts';

// Opens a backup with its password and reads what it contains (the start of the file only): enough to choose what
// to restore. The key is reused for the restore itself.
export const readBackupPreview = async (file: Blob, password: string) => {
  const { header, reader } = await openBackup(file);

  try {
    const key = await unlockBackupKey(header, password);
    const records = createRecordReader(reader, key);
    const first = await records.next();

    if (first.type !== RecordType.Info) {
      throw new Error(DAMAGED);
    }

    const info = await records.json<BackupInfo>(first.plain);
    const contacts: ContactRecord[] = [];

    if (!Array.isArray(info.chats)) {
      throw new Error(DAMAGED);
    }

    for (let i = 0; i < info.chats.length; i += 1) {
      const { type, plain } = await records.next();
      const record = type === RecordType.Contact ? await records.json<ContactRecord>(plain) : null;

      if (!record || !validContact(record.contact)) {
        throw new Error(DAMAGED);
      }

      contacts.push(record);
    }

    return { key, info, contacts };
  } finally {
    reader.cancel();
  }
};
