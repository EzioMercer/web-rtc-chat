import type { Sealed } from '../crypto/types.ts';

// How the contact list and our keys are protected on this device.
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
  contacts: Sealed;
  keys: Record<string, Sealed>;
};

// Our key pair for one contact (see contactKeys).
export type ContactKey = {
  // Raw P-256 point, base64url. Only this contact gets it.
  publicKey: string;
  // Non-extractable: page scripts can't copy it out.
  signingKey: CryptoKey;
  // The private key encrypted with the vault key, as it is saved.
  sealed: Sealed;
};
