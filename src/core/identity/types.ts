import type { Sealed } from '../crypto/types.ts';

// How the contact list and our keys are protected on this device.
//  passkey:    a key from the passkey (fingerprint, face or device PIN) encrypts them.
//  passphrase: a key derived from a passphrase (Argon2id) encrypts them.
//  device:     a key kept in browser storage encrypts them: no unlock step, but no protection either.
//  temporary:  nothing is saved; everything disappears when the tab closes.
// Saved or sent as numbers: never change a value; add new ones at the end.
export enum ProtectionMode {
  Passkey = 0,
  Passphrase = 1,
  Device = 2,
  Temporary = 3,
}

export type StoredMode = Exclude<ProtectionMode, ProtectionMode.Temporary>;

// Saved unencrypted: what is needed to unlock. Everything else is encrypted with the data key, which is saved here
// encrypted with the protection's key (passkey, passphrase or device key). Changing the protection only encrypts
// the data key again; the saved messages and files stay as they are.
export type StoredMeta = {
  version: 1;
  mode: StoredMode;
  dataKey: Sealed;
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

// Our key pair for one contact (see contactKeys).
export type ContactKey = {
  // Raw P-256 point, base64url. Only this contact gets it.
  publicKey: string;
  // Non-extractable: page scripts can't copy it out.
  signingKey: CryptoKey;
  // The private key encrypted with the vault key, as it is saved.
  sealed: Sealed;
};
