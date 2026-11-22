import { FORMAT } from './config.ts';

// Zips `blob`, streaming, so a big file never has to be in memory twice.
export const deflateBlob = (blob: Blob): Promise<Blob> => new Response(
  blob.stream().pipeThrough(new CompressionStream(FORMAT)),
).blob();
