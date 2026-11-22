import { utf8 } from '../crypto/utf8.ts';
import { sealRecord } from './sealRecord.ts';

export const sealJsonRecord = (key: string, value: unknown) => sealRecord(key, utf8(JSON.stringify(value)));
