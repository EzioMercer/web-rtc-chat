import type { Sealed } from '../crypto/types.ts';
import { unseal } from '../crypto/unseal.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { kv } from '../storage/kv.ts';
import { contactKeys } from './contactKeys.ts';
import { importSigningKey } from './importSigningKey.ts';
import { STORAGE_KEYS } from './storageKeys.ts';

// Decrypts our saved key for each contact, ready to sign.
export const loadContactKeys = async (vaultKey: CryptoKey, contacts: Contact[]) => {
  const saved = await kv.get<Record<string, Sealed>>(STORAGE_KEYS.keys) ?? {};

  contactKeys.clear();

  for (const contact of contacts) {
    const sealed = saved[contact.id];

    if (sealed) {
      const pkcs8 = await unseal(vaultKey, sealed);

      contactKeys.set(contact.id, { publicKey: contact.myKey, signingKey: await importSigningKey(pkcs8), sealed });
      pkcs8.fill(0);
    }
  }
};
