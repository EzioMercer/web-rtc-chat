import { kv } from '../storage/kv.ts';

// Deletes everything saved on this device: identity, contacts, chats and files.
export const resetIdentity = async () => {
  await kv.clear();
};
