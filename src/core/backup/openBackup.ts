import { BACKUP_FORMAT, MAGIC, MAX_HEADER_BYTES } from './config.ts';
import { createByteReader } from './createByteReader.ts';
import type { BackupHeader } from './types.ts';

const NOT_A_BACKUP = 'This is not a P2P Chat backup file.';

// Starts reading a backup file: checks that it is one, in a layout this version knows, and reads its header.
export const openBackup = async (file: Blob) => {
  const reader = createByteReader(file.stream());
  const start = await reader.read(MAGIC.length + 6);

  if (!start || MAGIC.some((byte, i) => start[i] !== byte)) {
    reader.cancel();
    throw new Error(NOT_A_BACKUP);
  }

  const view = new DataView(start.buffer);
  const format = view.getUint16(MAGIC.length);
  const length = view.getUint32(MAGIC.length + 2);

  if (format > BACKUP_FORMAT) {
    reader.cancel();
    throw new Error('This backup was made by a newer version of the app. Reload the app, then try again.');
  }

  const bytes = length <= MAX_HEADER_BYTES ? await reader.read(length) : null;
  let header: BackupHeader;

  try {
    header = JSON.parse(new TextDecoder().decode(bytes ?? new Uint8Array())) as BackupHeader;
  } catch {
    reader.cancel();
    throw new Error(NOT_A_BACKUP);
  }

  if (typeof header.salt !== 'string' || typeof header.key !== 'string') {
    reader.cancel();
    throw new Error(NOT_A_BACKUP);
  }

  return { header, reader };
};
