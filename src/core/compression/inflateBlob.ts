import { FORMAT } from './config.ts';

// Unzips `blob` into at most `maxBytes`, as `type`. Throws when it is not zipped data or would unpack into more
// (a small upload that unpacks into gigabytes must not fill the memory).
export const inflateBlob = async (blob: Blob, maxBytes: number, type = ''): Promise<Blob> => {
  const reader = blob.stream().pipeThrough(new DecompressionStream(FORMAT)).getReader();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      return new Blob(parts, { type });
    }

    total += value.byteLength;

    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Unzipped data is too big');
    }

    parts.push(value);
  }
};
