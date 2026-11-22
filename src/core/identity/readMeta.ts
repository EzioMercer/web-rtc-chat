import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { toProtectionMode } from './toProtectionMode.ts';
import type { StoredMeta, StoredMode } from './types.ts';

// The saved identity's description, with the mode in its current form (older versions saved a word).
export const readMeta = async (): Promise<StoredMeta | undefined> => {
  const meta = await kv.get<StoredMeta>(STORAGE_KEYS.meta);

  return meta && { ...meta, mode: toProtectionMode(meta.mode) as StoredMode };
};
