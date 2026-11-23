import type { Contact } from '../../store/contacts/types.ts';
import { kv } from '../storage/kv.ts';
import { contactsWrites } from './contactsWrites.ts';
import { ProtectionMode } from './types.ts';
import { vault } from './vault.ts';

// Encrypts and saves the contact list and our keys for them, together. Temporary identities save nothing.
export const saveContacts = async (contacts: Contact[]) => {
  if (!vault.vaultKey || vault.mode === null || vault.mode === ProtectionMode.Temporary) {
    return;
  }

  await kv.batch(await contactsWrites(contacts));
};
