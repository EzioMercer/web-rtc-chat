import { FILE_CHUNK } from './config.ts';
import { memoryFileKey } from './memoryFileKey.ts';
import { memoryFiles } from './memoryFiles.ts';
import { readFileChunk } from './readFileChunk.ts';

// A file's whole content: from this session's memory, or decrypted from storage piece by piece.
export const loadFileBlob = async (chat: string, file: { id: string; size: number; mime: string }): Promise<Blob> => {
  const inMemory = memoryFiles.get(memoryFileKey(chat, file.id));

  if (inMemory) {
    return inMemory;
  }

  const parts: Uint8Array<ArrayBuffer>[] = [];
  const count = Math.ceil(file.size / FILE_CHUNK);

  for (let n = 0; n < count; n += 1) {
    parts.push(await readFileChunk(chat, file.id, n));
  }

  const blob = new Blob(parts, { type: file.mime });

  if (blob.size !== file.size) {
    throw new Error('This file is missing on this device.');
  }

  return blob;
};
