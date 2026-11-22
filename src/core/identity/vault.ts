import type { ProtectionMode, StoredMeta } from './types.ts';

// The unlocked vault. Memory only: it is gone when the tab closes.
type Vault = {
  mode: ProtectionMode | null;
  meta: StoredMeta | null;
  // Encrypts the contacts, our keys for them and the settings at rest.
  vaultKey: CryptoKey | null;
};

export const vault: Vault = {
  mode: null,
  meta: null,
  vaultKey: null,
};
