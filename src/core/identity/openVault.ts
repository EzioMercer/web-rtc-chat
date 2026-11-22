import type { Sealed } from '../crypto/types.ts';
import { unseal } from '../crypto/unseal.ts';
import { importSigningKey } from './importSigningKey.ts';
import type { ProtectionMode, StoredMeta } from './types.ts';
import { vault } from './vault.ts';

// Decrypts the identity with `key` and keeps it in memory, ready to sign.
export const openVault = async (
  mode: ProtectionMode,
  meta: StoredMeta | null,
  publicKey: string,
  key: CryptoKey,
  sealedIdentity: Sealed,
) => {
  const pkcs8 = await unseal(key, sealedIdentity);

  vault.signingKey = await importSigningKey(pkcs8);
  pkcs8.fill(0);
  vault.mode = mode;
  vault.meta = meta;
  vault.publicKey = publicKey;
  vault.vaultKey = key;
  vault.sealedIdentity = sealedIdentity;
};
