import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { seal } from '../crypto/seal.ts';
import { importSigningKey } from './importSigningKey.ts';
import type { ContactKey } from './types.ts';
import { vault } from './vault.ts';

// A new key pair for one contact. The private key is exported once, to be encrypted with the vault key for storage,
// and is otherwise only kept as a key that page scripts can't copy out.
export const newContactKey = async (): Promise<ContactKey> => {
  if (!vault.vaultKey) {
    throw new Error('Identity is locked');
  }

  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const sealed = await seal(vault.vaultKey, pkcs8);
  const signingKey = await importSigningKey(pkcs8);

  pkcs8.fill(0);

  return { publicKey: bytesToB64(raw), signingKey, sealed };
};
