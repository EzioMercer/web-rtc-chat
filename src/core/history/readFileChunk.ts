import { kv } from '../storage/kv.ts';
import { FILE_CHUNK } from './config.ts';
import { historyKeys } from './historyKeys.ts';
import { memoryFileKey } from './memoryFileKey.ts';
import { memoryFiles } from './memoryFiles.ts';
import { openRecord } from './openRecord.ts';
import { slots } from './slots.ts';

// Piece `n` (of FILE_CHUNK bytes) of a file: from memory, or decrypted from storage. Reading a big file this way
// never holds it whole. Throws if the piece is missing.
export const readFileChunk = async (chat: string, id: string, n: number): Promise<Uint8Array<ArrayBuffer>> => {
  const inMemory = memoryFiles.get(memoryFileKey(chat, id));

  if (inMemory) {
    return new Uint8Array(await inMemory.slice(n * FILE_CHUNK, (n + 1) * FILE_CHUNK).arrayBuffer());
  }

  const slot = slots.map.get(chat);
  const key = slot ? historyKeys.chunk(slot, id, n) : '';
  const sealed = slot ? await kv.get<Uint8Array<ArrayBuffer>>(key) : undefined;

  if (!sealed) {
    throw new Error('A file is missing on this device.');
  }

  return openRecord(key, sealed);
};
