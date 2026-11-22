import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { importAesKey } from '../crypto/importAesKey.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import { sealBytes } from '../crypto/sealBytes.ts';
import { utf8 } from '../crypto/utf8.ts';
import { derivePassphraseKey } from '../identity/passphrase/derivePassphraseKey.ts';
import type { ByteSink } from './ByteSink.ts';
import { BACKUP_FORMAT, MAGIC } from './config.ts';
import { recordContext } from './recordContext.ts';
import type { RecordType } from './RecordType.ts';
import type { BackupHeader } from './types.ts';
import { zipBytes } from './zipBytes.ts';

// Starts a backup file on `sink`, locked with `password`: its own random key encrypts every record, and the
// password (through Argon2id, like the passphrase) encrypts that key.
//
// Layout: MAGIC, format (2 bytes), header length (4 bytes), header (JSON, see BackupHeader), then records: type
// (1 byte), length (4 bytes), the record encrypted (see recordContext). Numbers are big-endian.
export const createBackupWriter = async (sink: ByteSink, password: string) => {
  const salt = bytesToB64(randomBytes(16));
  const passwordKey = await derivePassphraseKey(password, salt);
  const raw = randomBytes(32);
  const key = await importAesKey(raw);
  const header: BackupHeader = { salt, key: bytesToB64(await sealBytes(passwordKey, raw)) };

  raw.fill(0);

  const headerBytes = utf8(JSON.stringify(header));
  const start = new Uint8Array(MAGIC.length + 6 + headerBytes.length);
  const view = new DataView(start.buffer);

  start.set(MAGIC);
  view.setUint16(MAGIC.length, BACKUP_FORMAT);
  view.setUint32(MAGIC.length + 2, headerBytes.length);
  start.set(headerBytes, MAGIC.length + 6);
  await sink.write(start);

  let seq = 0;

  const record = async (type: RecordType, plain: Uint8Array<ArrayBuffer>) => {
    const sealed = await sealBytes(key, plain, recordContext(seq, type));
    const frame = new Uint8Array(5 + sealed.length);

    seq += 1;
    frame[0] = type;
    new DataView(frame.buffer).setUint32(1, sealed.length);
    frame.set(sealed, 5);
    await sink.write(frame);

    return frame.length;
  };

  return {
    // Writes a record; resolves with how many bytes it took in the file.
    record,
    // A record of JSON, zipped.
    json: async (type: RecordType, value: unknown) => record(type, await zipBytes(utf8(JSON.stringify(value)))),
    // Records written so far.
    count: () => seq,
  };
};
