import { seal } from '../crypto/seal.ts';
import { kv } from '../storage/kv.ts';
import { generateIdentity } from './generateIdentity.ts';
import { keyForChoice } from './keyForChoice.ts';
import { openVault } from './openVault.ts';
import { saveContacts } from './saveContacts.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import type { ProtectionChoice, StoredMeta } from './types.ts';

// First launch: makes a new identity, protects it the way the user chose, and unlocks it.
export const createIdentity = async (choice: ProtectionChoice) => {
  const { key, meta: keyMeta } = await keyForChoice(choice);
  const { pkcs8, publicKey } = await generateIdentity();
  const sealedIdentity = await seal(key, pkcs8);

  pkcs8.fill(0);

  if (choice.mode === 'temporary') {
    await openVault('temporary', null, publicKey, key, sealedIdentity);

    return;
  }

  const meta: StoredMeta = { version: 1, mode: choice.mode, publicKey, ...keyMeta };

  await kv.set(STORAGE_KEYS.identity, sealedIdentity);
  await kv.set(STORAGE_KEYS.meta, meta);
  await openVault(choice.mode, meta, publicKey, key, sealedIdentity);
  await saveContacts([]);
};
