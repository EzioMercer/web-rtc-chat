import { bytesToB64 } from '../crypto/bytesToB64.ts';

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };

// A new identity key pair. The private key is exported once, so it can be encrypted for storage.
export const generateIdentity = async (): Promise<{ pkcs8: Uint8Array<ArrayBuffer>; publicKey: string }> => {
  const pair = await crypto.subtle.generateKey(ALGORITHM, true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));

  return { pkcs8, publicKey: bytesToB64(raw) };
};
