import type { RecordType } from './RecordType.ts';

// Bound to each record's encryption: its place in the file and its type. A record moved, dropped or relabelled
// fails to decrypt, so a file can't be cut or reshuffled without the restore noticing.
export const recordContext = (seq: number, type: RecordType): Uint8Array<ArrayBuffer> => {
  const context = new Uint8Array(5);

  new DataView(context.buffer).setUint32(0, seq);
  context[4] = type;

  return context;
};
