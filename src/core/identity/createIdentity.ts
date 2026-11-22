import { importAesKey } from '../crypto/importAesKey.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import { seal } from '../crypto/seal.ts';
import { kv } from '../storage/kv.ts';
import { contactKeys } from './contactKeys.ts';
import { keyForChoice } from './keyForChoice.ts';
import { saveContacts } from './saveContacts.ts';
import { STORAGE_KEYS } from './storageKeys.ts';
import { type ProtectionChoice, type StoredMeta, ProtectionMode } from './types.ts';
import { vault } from './vault.ts';

// First launch (or a restored backup): a new data key, protected the way the user chose, and an empty contact list.
// Keys come later, one for each contact. With `save` false nothing is written yet (a restore writes it all at once).
export const createIdentity = async (choice: ProtectionChoice, save = true) => {
  const { key: wrapKey, meta: keyMeta } = await keyForChoice(choice);
  const raw = randomBytes(32);
  const temporary = choice.mode === ProtectionMode.Temporary;
  const meta: StoredMeta | null = temporary
    ? null
    : { version: 1, mode: choice.mode, dataKey: await seal(wrapKey, raw), ...keyMeta };

  contactKeys.clear();
  vault.mode = choice.mode;
  vault.meta = meta;
  vault.vaultKey = await importAesKey(raw);
  vault.wrapKey = temporary ? null : wrapKey;
  raw.fill(0);

  if (meta && save) {
    await kv.set(STORAGE_KEYS.meta, meta);
    await saveContacts([]);
  }
};
