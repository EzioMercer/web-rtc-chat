import { sealJson } from '../crypto/sealJson.ts';
import type { Sealed } from '../crypto/types.ts';
import type { Contact } from '../../store/contacts/types.ts';
import type { KvWrite } from '../storage/kv.ts';
import { contactKeys } from './contactKeys.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { vault } from './vault.ts';

// The writes that save the contact list (encrypted) and our key for each of them (already encrypted, see
// newContactKey), to be written together.
export const contactsWrites = async (contacts: Contact[]): Promise<KvWrite[]> => {
  if (!vault.vaultKey) {
    throw new Error('Identity is locked');
  }

  const keys: Record<string, Sealed> = {};

  contacts.forEach((contact) => {
    const key = contactKeys.get(contact.id);

    if (key) {
      keys[contact.id] = key.sealed;
    }
  });

  return [
    { key: STORAGE_KEYS.contacts, value: await sealJson(vault.vaultKey, contacts) },
    { key: STORAGE_KEYS.keys, value: keys },
  ];
};
