import { sealJson } from '../crypto/sealJson.ts';
import type { Contact } from '../store/contacts/types.ts';
import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { vault } from './vault.ts';

// Encrypts and saves the contact list. Temporary identities save nothing.
export const saveContacts = async (contacts: Contact[]) => {
  if (!vault.vaultKey || vault.mode === 'temporary' || !vault.mode) {
    return;
  }

  await kv.set(STORAGE_KEYS.contacts, await sealJson(vault.vaultKey, contacts));
};
