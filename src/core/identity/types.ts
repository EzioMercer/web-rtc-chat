import type { Sealed } from '../crypto/types.ts';

// How the identity and contact list are protected on this device.
//  passkey:    a key from the passkey (fingerprint, face or device PIN) encrypts them.
//  passphrase: a key derived from a passphrase (Argon2id) encrypts them.
//  device:     a key kept in browser storage encrypts them: no unlock step, but no protection either.
//  temporary:  nothing is saved; everything disappears when the tab closes.
export enum ProtectionMode {
  Passkey,
  Passphrase,
  Device,
  Temporary,
}

export type StoredMode = Exclude<ProtectionMode, ProtectionMode.Temporary>;

export type StoredMeta = {
  version: 1;
  mode: StoredMode;
  // Our public identity key (raw P-256 point, base64url).
  publicKey: string;
  credentialId?: string;
  prfSalt?: string;
  argonSalt?: string;
};

// What the user chose on the setup or settings screen.
export type ProtectionChoice =
  | { mode: ProtectionMode.Passkey }
  | { mode: ProtectionMode.Passphrase; passphrase: string }
  | { mode: ProtectionMode.Device }
  | { mode: ProtectionMode.Temporary };

export type Backup = {
  app: 'web-rtc-chat';
  version: 1;
  meta: StoredMeta;
  identity: Sealed;
  contacts: Sealed | null;
};
