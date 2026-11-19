import { kv } from '../storage/kv.ts';

// Deletes the saved identity and contacts from this device.
export const resetIdentity = async () => {
  await kv.clear();
};
