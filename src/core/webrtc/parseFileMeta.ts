import { type MediaNote, NoteType } from '../../store/chat/types.ts';
import type { FileMeta } from './types.ts';

// A voice message longer than a day, or a waveform with more bars than we draw, is not from this app.
const MAX_NOTE_MS = 24 * 60 * 60 * 1000;
const MAX_WAVE_BARS = 64;
const MAX_WAVE_LEVEL = 31;

const isLevel = (value: unknown) => Number.isInteger(value) && (value as number) >= 0
  && (value as number) <= MAX_WAVE_LEVEL;

// Keeps only a well-formed note; anything else is dropped and the file shows as a plain file.
const parseNote = (note: unknown): MediaNote | undefined => {
  if (!note || typeof note !== 'object') {
    return undefined;
  }

  const { type, duration, wave } = note as Partial<MediaNote>;
  const valid = (type === NoteType.Voice || type === NoteType.Video)
    && typeof duration === 'number'
    && Number.isFinite(duration)
    && duration >= 0
    && duration <= MAX_NOTE_MS
    && (wave === undefined || (Array.isArray(wave) && wave.length <= MAX_WAVE_BARS && wave.every(isLevel)));

  return valid ? { type, duration, ...(wave ? { wave } : {}) } : undefined;
};

// Validates the first message of a file channel.
export const parseFileMeta = (data: unknown): FileMeta | null => {
  if (typeof data !== 'string') {
    return null;
  }

  try {
    const meta = JSON.parse(data) as Partial<FileMeta>;
    const valid = typeof meta.id === 'string'
      && typeof meta.name === 'string'
      && typeof meta.size === 'number'
      && meta.size >= 0
      && typeof meta.mime === 'string';

    if (!valid) {
      return null;
    }

    const note = parseNote(meta.note);
    const { id, name, size, mime } = meta as FileMeta;

    return { id, name, size, mime, ...(note ? { note } : {}) };
  } catch {
    return null;
  }
};
