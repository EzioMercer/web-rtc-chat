import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { toProtectionMode } from './toProtectionMode.ts';
import { type Backup, ProtectionMode, type StoredMode } from './types.ts';

// Saves a backup file's contents. It still has to be unlocked with its passkey or passphrase.
export const importBackup = async (text: string) => {
  let backup: Backup;

  try {
    backup = JSON.parse(text) as Backup;
  } catch {
    throw new Error('That is not a backup file.');
  }

  const { app, meta, identity, contacts } = backup;

  if (app !== 'web-rtc-chat' || !meta?.publicKey || !identity?.iv || !identity.data) {
    throw new Error('That is not a backup file.');
  }

  // Older backups have the mode as a word.
  const mode = toProtectionMode(meta.mode);

  if (mode !== ProtectionMode.Passkey && mode !== ProtectionMode.Passphrase) {
    throw new Error('This backup can\'t be restored.');
  }

  await kv.clear();
  await kv.set(STORAGE_KEYS.identity, identity);
  await kv.set(STORAGE_KEYS.meta, { ...meta, mode: mode as StoredMode });

  if (contacts) {
    await kv.set(STORAGE_KEYS.contacts, contacts);
  }
};
