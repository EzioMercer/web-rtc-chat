import { sealBytes } from '../crypto/sealBytes.ts';
import { unsealBytes } from '../crypto/unsealBytes.ts';
import { isCompressible } from '../compression/isCompressible.ts';
import { toStored } from '../history/toStored.ts';
import type { Message } from '../../store/chat/types.ts';
import { savedFiles } from './savedFiles.ts';
import { zipBytes } from './zipBytes.ts';

// Text sampled to see how well this person's chats zip.
const SAMPLE_BYTES = 256 * 1024;
// Data used to time this device.
const TIMING_BYTES = 4 * 1024 * 1024;
// Reading and writing storage costs about as much again as the encryption measured.
const STORAGE_FACTOR = 3;

export type ChatSize = {
  // Size in the file (estimated, zipped where it zips) of the text and of the media, in bytes.
  text: number;
  media: number;
  // Bytes of work, as backupWork counts them.
  work: number;
};

// Estimates for the backup dialog: each chat's size in the file, how well text zips, and how fast this device is
// (bytes of work per millisecond).
export const measureBackup = async (chats: Record<string, Message[]>) => {
  const texts = Object.fromEntries(Object.entries(chats).map(([id, messages]) => [
    id,
    JSON.stringify(messages.map(toStored)),
  ]));
  const sample = Object.values(texts).join('').slice(0, SAMPLE_BYTES);
  const zipped = sample.length ? (await zipBytes(new TextEncoder().encode(sample))).length : 0;
  const ratio = sample.length ? Math.min(1, zipped / sample.length) : 1;

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const data = new Uint8Array(TIMING_BYTES);
  const started = performance.now();

  await unsealBytes(key, await sealBytes(key, data));
  await unsealBytes(key, await sealBytes(key, data));

  const speed = TIMING_BYTES / Math.max(1, (performance.now() - started) * STORAGE_FACTOR);
  const sizes: Record<string, ChatSize> = {};

  Object.entries(chats).forEach(([id, messages]) => {
    const files = savedFiles(messages);
    const media = files.reduce((total, file) => total + file.size, 0);
    // Text-like files are zipped too (about as well as the chat text, as a guess); the rest go as they are.
    const mediaInFile = files.reduce((total, file) => total + (
      isCompressible(new File([], file.name, { type: file.mime })) ? Math.ceil(file.size * ratio) : file.size
    ), 0);
    const text = messages.length ? Math.ceil(texts[id].length * ratio) : 0;

    sizes[id] = { text, media: mediaInFile, work: texts[id].length + media };
  });

  return { sizes, speed };
};
