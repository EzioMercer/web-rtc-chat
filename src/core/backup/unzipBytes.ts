import { inflateBlob } from '../compression/inflateBlob.ts';
import { MAX_UNZIPPED_BYTES } from './config.ts';

export const unzipBytes = async (bytes: Uint8Array<ArrayBuffer>, max = MAX_UNZIPPED_BYTES) => new Uint8Array(
  await (await inflateBlob(new Blob([bytes]), max)).arrayBuffer(),
);
