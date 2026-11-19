import { utf8 } from './utf8.ts';

type Bytes = Uint8Array<ArrayBuffer>;

export const sha256 = async (data: string | Bytes): Promise<Bytes> => new Uint8Array(
  await crypto.subtle.digest('SHA-256', typeof data === 'string' ? utf8(data) : data),
);
