import type { FileMeta } from './types.ts';

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

    return valid ? (meta as FileMeta) : null;
  } catch {
    return null;
  }
};
