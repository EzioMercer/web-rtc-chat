import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import { MAX_TEXT_BYTES } from './config.ts';
import { inflateBlob } from './inflateBlob.ts';

// Undoes `zipText`. Throws on anything else.
export const unzipText = async (zipped: string): Promise<string> => (
  await inflateBlob(new Blob([b64ToBytes(zipped.trim())]), MAX_TEXT_BYTES)
).text();
