import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { deflateBlob } from './deflateBlob.ts';

// Text -> zipped -> base64url. A connection description is mostly repeated words and addresses: measured, a
// manual code came out about 30% shorter, even after base64 gives a third back.
export const zipText = async (text: string): Promise<string> => bytesToB64(
  new Uint8Array(await (await deflateBlob(new Blob([text]))).arrayBuffer()),
);
