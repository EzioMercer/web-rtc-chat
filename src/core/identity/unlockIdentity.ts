import type { Sealed } from '../crypto/types.ts';
import { unsealJson } from '../crypto/unsealJson.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { kv } from '../storage/kv.ts';
import { loadContactKeys } from './loadContactKeys.ts';
import { openDataKey } from './openDataKey.ts';
import { readMeta } from './readMeta.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { vault } from './vault.ts';

// Unlocks the vault and returns the decrypted contact list.
export const unlockIdentity = async (passphrase?: string): Promise<Contact[]> => {
  const meta = await readMeta();
  const sealedContacts = await kv.get<Sealed>(STORAGE_KEYS.contacts);

  if (!meta || !sealedContacts) {
    throw new Error('No saved identity.');
  }

  const { dataKey, wrapKey } = await openDataKey(meta, passphrase);
  let contacts: Contact[];

  try {
    contacts = await unsealJson<Contact[]>(dataKey, sealedContacts);
  } catch {
    throw new Error('The saved contacts are damaged.');
  }

  await loadContactKeys(dataKey, contacts);
  vault.mode = meta.mode;
  vault.meta = meta;
  vault.vaultKey = dataKey;
  vault.wrapKey = wrapKey;

  return contacts;
};
