import { unsealBytes } from '../crypto/unsealBytes.ts';
import { DAMAGED, MAX_RECORD_BYTES } from './config.ts';
import type { createByteReader } from './createByteReader.ts';
import { recordContext } from './recordContext.ts';
import { RecordType } from './RecordType.ts';
import { unzipBytes } from './unzipBytes.ts';

// Reads the records after the header, one by one, decrypted. Anything changed, missing or out of place throws.
export const createRecordReader = (bytes: ReturnType<typeof createByteReader>, key: CryptoKey) => {
  let seq = 0;

  const next = async (): Promise<{ type: RecordType; plain: Uint8Array<ArrayBuffer> }> => {
    const head = await bytes.read(5);

    if (!head) {
      throw new Error(DAMAGED);
    }

    const type = head[0] as RecordType;
    const length = new DataView(head.buffer).getUint32(1);
    const sealed = length <= MAX_RECORD_BYTES && RecordType[type] !== undefined ? await bytes.read(length) : null;

    if (!sealed) {
      throw new Error(DAMAGED);
    }

    try {
      const plain = await unsealBytes(key, sealed, recordContext(seq, type));

      seq += 1;

      return { type, plain };
    } catch {
      throw new Error(DAMAGED);
    }
  };

  return {
    next,
    // A JSON record's value.
    json: async <T>(plain: Uint8Array<ArrayBuffer>): Promise<T> => {
      try {
        return JSON.parse(new TextDecoder().decode(await unzipBytes(plain))) as T;
      } catch {
        throw new Error(DAMAGED);
      }
    },
    count: () => seq,
  };
};
