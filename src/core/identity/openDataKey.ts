import { importAesKey } from '../crypto/importAesKey.ts';
import { unseal } from '../crypto/unseal.ts';
import { keyForMeta } from './keyForMeta.ts';
import { type StoredMeta, ProtectionMode } from './types.ts';

// Asks for the passkey (or uses the passphrase or device key) and opens the data key with it. Opening it also
// proves the passphrase is right.
export const openDataKey = async (
  meta: StoredMeta,
  passphrase?: string,
): Promise<{ dataKey: CryptoKey; wrapKey: CryptoKey }> => {
  const wrapKey = await keyForMeta(meta, passphrase);
  let raw: Uint8Array<ArrayBuffer>;

  try {
    raw = await unseal(wrapKey, meta.dataKey);
  } catch {
    throw new Error(meta.mode === ProtectionMode.Passphrase ? 'Wrong passphrase.' : 'Could not unlock the identity.');
  }

  const dataKey = await importAesKey(raw);

  raw.fill(0);

  return { dataKey, wrapKey };
};
