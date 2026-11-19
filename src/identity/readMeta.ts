import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import type { StoredMeta } from './types.ts';

export const readMeta = (): Promise<StoredMeta | undefined> => kv.get<StoredMeta>(STORAGE_KEYS.meta);
