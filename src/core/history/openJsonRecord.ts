import { openRecord } from './openRecord.ts';

export const openJsonRecord = async <T>(key: string, sealed: Uint8Array<ArrayBuffer>): Promise<T> => JSON.parse(
  new TextDecoder().decode(await openRecord(key, sealed)),
) as T;
