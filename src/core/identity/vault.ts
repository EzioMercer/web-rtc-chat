import type { ProtectionMode, StoredMeta } from './types.ts';

// The unlocked vault. Memory only: it is gone when the tab closes.
type Vault = {
  mode: ProtectionMode | null;
  meta: StoredMeta | null;
  // The data key: encrypts the contacts, our keys for them, the settings, messages and files at rest.
  vaultKey: CryptoKey | null;
  // The protection's key, which encrypts the data key (see StoredMeta). None for a temporary identity.
  wrapKey: CryptoKey | null;
};

export const vault: Vault = {
  mode: null,
  meta: null,
  vaultKey: null,
  wrapKey: null,
};
