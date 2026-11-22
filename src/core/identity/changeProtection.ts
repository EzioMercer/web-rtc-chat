import { importAesKey } from '../crypto/importAesKey.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import { seal } from '../crypto/seal.ts';
import { unseal } from '../crypto/unseal.ts';
import type { Contact } from '../../store/contacts/types.ts';
import type { SettingsState } from '../../store/settings/types.ts';
import { kv } from '../storage/kv.ts';
import { contactKeys } from './contactKeys.ts';
import { keyForChoice } from './keyForChoice.ts';
import { saveContacts } from './saveContacts.ts';
import { saveSettings } from './saveSettings.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { type ProtectionChoice, type StoredMeta, ProtectionMode } from './types.ts';
import { vault } from './vault.ts';

// Switches to a different protection. Between saved protections only the data key is encrypted again, so it is
// instant and the saved data stays as it is. The new key is made first, so a cancelled passkey prompt leaves
// everything as it was. Returns true when nothing was saved before (a temporary identity), so the caller must now
// save the messages too. Going temporary deletes everything saved: the caller keeps what it needs in memory first.
export const changeProtection = async (
  choice: ProtectionChoice,
  contacts: Contact[],
  settings: SettingsState,
): Promise<boolean> => {
  if (!vault.vaultKey) {
    throw new Error('Identity is locked');
  }

  const { key: wrapKey, meta: keyMeta } = await keyForChoice(choice);
  const before = vault.meta;

  if (choice.mode === ProtectionMode.Temporary) {
    vault.mode = choice.mode;
    vault.meta = null;
    vault.wrapKey = null;
    await kv.clear();

    return false;
  }

  let raw: Uint8Array<ArrayBuffer>;

  if (before && vault.wrapKey) {
    raw = await unseal(vault.wrapKey, before.dataKey);
  } else {
    // A temporary identity's key was never meant to be saved: from now on a new one encrypts everything.
    raw = randomBytes(32);

    const dataKey = await importAesKey(raw);

    for (const contactKey of contactKeys.values()) {
      const pkcs8 = await unseal(vault.vaultKey, contactKey.sealed);

      contactKey.sealed = await seal(dataKey, pkcs8);
      pkcs8.fill(0);
    }

    vault.vaultKey = dataKey;
  }

  const meta: StoredMeta = { version: 1, mode: choice.mode, dataKey: await seal(wrapKey, raw), ...keyMeta };

  raw.fill(0);
  vault.mode = choice.mode;
  vault.meta = meta;
  vault.wrapKey = wrapKey;

  if (!before) {
    await saveContacts(contacts);
    await saveSettings(settings);
  }

  // Last: until this is written, the old protection still opens everything.
  await kv.set(STORAGE_KEYS.meta, meta);

  if (choice.mode !== ProtectionMode.Device) {
    await kv.delete(STORAGE_KEYS.deviceKey);
  }

  return !before;
};
