import type { Sealed } from '../crypto/types.ts';
import type { ProtectionMode, StoredMeta } from './types.ts';

// The unlocked identity. Memory only: it is gone when the tab closes.
type Vault = {
  mode: ProtectionMode | null;
  meta: StoredMeta | null;
  // Signs everything we send through relays. Non-extractable: page scripts can't copy it out.
  signingKey: CryptoKey | null;
  publicKey: string;
  // Encrypts the identity and the contact list at rest.
  vaultKey: CryptoKey | null;
  sealedIdentity: Sealed | null;
};

export const vault: Vault = {
  mode: null,
  meta: null,
  signingKey: null,
  publicKey: '',
  vaultKey: null,
  sealedIdentity: null,
};
