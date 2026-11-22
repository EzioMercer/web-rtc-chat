import { kv } from '../storage/kv.ts';
import { contactKeys } from './contactKeys.ts';
import { keyForChoice } from './keyForChoice.ts';
import { saveContacts } from './saveContacts.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { type ProtectionChoice, type StoredMeta, ProtectionMode } from './types.ts';
import { vault } from './vault.ts';

// First launch: makes the vault key the way the user chose, and an empty contact list. Keys come later, one for
// each contact.
export const createIdentity = async (choice: ProtectionChoice) => {
  const { key, meta: keyMeta } = await keyForChoice(choice);
  const meta: StoredMeta | null = choice.mode === ProtectionMode.Temporary
    ? null
    : { version: 1, mode: choice.mode, ...keyMeta };

  contactKeys.clear();
  vault.mode = choice.mode;
  vault.meta = meta;
  vault.vaultKey = key;

  if (meta) {
    await kv.set(STORAGE_KEYS.meta, meta);
    await saveContacts([]);
  }
};
