import type { Sealed } from '../crypto/types.ts';
import { unsealJson } from '../crypto/unsealJson.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { kv } from '../storage/kv.ts';
import { keyForMeta } from './keyForMeta.ts';
import { openVault } from './openVault.ts';
import { readMeta } from './readMeta.ts';
import { STORAGE_KEYS } from './storageKeys.ts';

// Unlocks the saved identity and returns the decrypted contact list.
export const unlockIdentity = async (passphrase?: string): Promise<Contact[]> => {
  const meta = await readMeta();
  const sealedIdentity = await kv.get<Sealed>(STORAGE_KEYS.identity);

  if (!meta || !sealedIdentity) {
    throw new Error('No saved identity.');
  }

  const key = await keyForMeta(meta, passphrase);

  try {
    await openVault(meta.mode, meta, meta.publicKey, key, sealedIdentity);
  } catch {
    throw new Error(meta.mode === 'passphrase' ? 'Wrong passphrase.' : 'Could not unlock the identity.');
  }

  const sealedContacts = await kv.get<Sealed>(STORAGE_KEYS.contacts);

  return sealedContacts ? unsealJson<Contact[]>(key, sealedContacts) : [];
};
