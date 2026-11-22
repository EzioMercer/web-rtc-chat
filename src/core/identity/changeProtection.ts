import { seal } from '../crypto/seal.ts';
import { unseal } from '../crypto/unseal.ts';
import type { Contact } from '../../store/contacts/types.ts';
import type { SettingsState } from '../../store/settings/types.ts';
import { kv } from '../storage/kv.ts';
import { keyForChoice } from './keyForChoice.ts';
import { saveContacts } from './saveContacts.ts';
import { saveSettings } from './saveSettings.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import type { ProtectionChoice, StoredMeta } from './types.ts';
import { vault } from './vault.ts';

// Re-encrypts the same identity, contacts and settings with a different protection. Contacts notice nothing.
// The new key is made first, so a cancelled passkey prompt leaves everything as it was.
export const changeProtection = async (choice: ProtectionChoice, contacts: Contact[], settings: SettingsState) => {
  if (!vault.vaultKey || !vault.sealedIdentity) {
    throw new Error('Identity is locked');
  }

  const pkcs8 = await unseal(vault.vaultKey, vault.sealedIdentity);
  const { key, meta: keyMeta } = await keyForChoice(choice);
  const sealedIdentity = await seal(key, pkcs8);

  pkcs8.fill(0);
  vault.mode = choice.mode;
  vault.vaultKey = key;
  vault.sealedIdentity = sealedIdentity;

  if (choice.mode === 'temporary') {
    vault.meta = null;
    await kv.clear();

    return;
  }

  const meta: StoredMeta = { version: 1, mode: choice.mode, publicKey: vault.publicKey, ...keyMeta };

  vault.meta = meta;
  await kv.set(STORAGE_KEYS.identity, sealedIdentity);
  await kv.set(STORAGE_KEYS.meta, meta);

  if (choice.mode !== 'device') {
    await kv.delete(STORAGE_KEYS.deviceKey);
  }

  await saveContacts(contacts);
  await saveSettings(settings);
};
