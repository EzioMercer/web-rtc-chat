import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { type Backup, ProtectionMode } from './types.ts';

// Saves a backup file's contents. It still has to be unlocked with its passkey or passphrase.
export const importBackup = async (text: string) => {
  let backup: Backup;

  try {
    backup = JSON.parse(text) as Backup;
  } catch {
    throw new Error('That is not a backup file.');
  }

  const { app, meta, contacts, keys } = backup;

  if (app !== 'web-rtc-chat' || !meta || !contacts?.iv || !contacts.data || typeof keys !== 'object') {
    throw new Error('That is not a backup file.');
  }

  if (meta.mode !== ProtectionMode.Passkey && meta.mode !== ProtectionMode.Passphrase) {
    throw new Error('This backup can\'t be restored.');
  }

  await kv.clear();
  await kv.set(STORAGE_KEYS.meta, meta);
  await kv.set(STORAGE_KEYS.contacts, contacts);
  await kv.set(STORAGE_KEYS.keys, keys);
};
