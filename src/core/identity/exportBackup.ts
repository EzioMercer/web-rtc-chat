import type { Sealed } from '../crypto/types.ts';
import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { type Backup, ProtectionMode } from './types.ts';
import { vault } from './vault.ts';

// The encrypted identity and contacts, as saved. Only passkey and passphrase backups can be restored elsewhere,
// because the device key never leaves this browser.
export const exportBackup = async (): Promise<Backup> => {
  const identity = await kv.get<Sealed>(STORAGE_KEYS.identity);
  const contacts = await kv.get<Sealed>(STORAGE_KEYS.contacts);

  const mode = vault.meta?.mode;

  if (!vault.meta || !identity || (mode !== ProtectionMode.Passkey && mode !== ProtectionMode.Passphrase)) {
    throw new Error('Only passkey or passphrase identities can be backed up.');
  }

  return { app: 'web-rtc-chat', version: 1, meta: vault.meta, identity, contacts: contacts ?? null };
};
