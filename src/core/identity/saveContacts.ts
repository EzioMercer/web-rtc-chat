import { sealJson } from '../crypto/sealJson.ts';
import type { Sealed } from '../crypto/types.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { kv } from '../storage/kv.ts';
import { contactKeys } from './contactKeys.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { vault } from './vault.ts';
import { ProtectionMode } from './types.ts';

// Encrypts and saves the contact list, and our key for each of them (already encrypted, see newContactKey).
// Temporary identities save nothing.
export const saveContacts = async (contacts: Contact[]) => {
  if (!vault.vaultKey || vault.mode === ProtectionMode.Temporary || !vault.mode) {
    return;
  }

  const keys: Record<string, Sealed> = {};

  contacts.forEach((contact) => {
    const key = contactKeys.get(contact.id);

    if (key) {
      keys[contact.id] = key.sealed;
    }
  });

  await kv.set(STORAGE_KEYS.contacts, await sealJson(vault.vaultKey, contacts));
  await kv.set(STORAGE_KEYS.keys, keys);
};
