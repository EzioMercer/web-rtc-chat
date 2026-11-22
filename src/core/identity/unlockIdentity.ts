import type { Sealed } from '../crypto/types.ts';
import { unsealJson } from '../crypto/unsealJson.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { kv } from '../storage/kv.ts';
import { keyForMeta } from './keyForMeta.ts';
import { loadContactKeys } from './loadContactKeys.ts';
import { readMeta } from './readMeta.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { ProtectionMode } from './types.ts';
import { vault } from './vault.ts';

// Unlocks the vault and returns the decrypted contact list. Opening the list also proves the key is right.
export const unlockIdentity = async (passphrase?: string): Promise<Contact[]> => {
  const meta = await readMeta();
  const sealedContacts = await kv.get<Sealed>(STORAGE_KEYS.contacts);

  if (!meta || !sealedContacts) {
    throw new Error('No saved identity.');
  }

  const key = await keyForMeta(meta, passphrase);
  let contacts: Contact[];

  try {
    contacts = await unsealJson<Contact[]>(key, sealedContacts);
  } catch {
    throw new Error(meta.mode === ProtectionMode.Passphrase ? 'Wrong passphrase.' : 'Could not unlock the identity.');
  }

  await loadContactKeys(key, contacts);
  vault.mode = meta.mode;
  vault.meta = meta;
  vault.vaultKey = key;

  return contacts;
};
