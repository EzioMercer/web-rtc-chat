import { MIN_FILE_BYTES, MIN_FILE_SAVING } from './config.ts';
import { deflateBlob } from './deflateBlob.ts';
import { isCompressible } from './isCompressible.ts';

// The zipped file, when zipping is worth it (text-like files); null to send the file as it is.
export const packFile = async (file: File): Promise<Blob | null> => {
  if (file.size < MIN_FILE_BYTES || !isCompressible(file)) {
    return null;
  }

  const zipped = await deflateBlob(file);

  return zipped.size <= file.size * (1 - MIN_FILE_SAVING) ? zipped : null;
};
