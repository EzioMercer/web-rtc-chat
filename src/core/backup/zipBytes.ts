import { deflateBlob } from '../compression/deflateBlob.ts';

export const zipBytes = async (bytes: BufferSource): Promise<Uint8Array<ArrayBuffer>> => new Uint8Array(
  await (await deflateBlob(new Blob([bytes]))).arrayBuffer(),
);
