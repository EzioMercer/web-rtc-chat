import { bytesToB64 } from '../../crypto/bytesToB64.ts';
import { randomBytes } from '../../crypto/randomBytes.ts';
import { getPasskeyKey } from './getPasskeyKey.ts';
import { prfToKey } from './prfToKey.ts';

// Creates a passkey for this app and returns the key it unlocks.
export const createPasskeyKey = async (): Promise<{ key: CryptoKey; credentialId: string; prfSalt: string }> => {
  const salt = randomBytes(32);
  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'P2P Chat' },
      user: { id: randomBytes(16), name: 'P2P Chat identity', displayName: 'P2P Chat' },
      challenge: randomBytes(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      extensions: { prf: { eval: { first: salt } } },
    },
  }) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('No passkey was created.');
  }

  const prf = credential.getClientExtensionResults().prf;

  if (!prf?.enabled) {
    throw new Error('This device\'s passkeys can\'t encrypt data. Choose a passphrase instead.');
  }

  const credentialId = bytesToB64(new Uint8Array(credential.rawId));
  const prfSalt = bytesToB64(salt);

  // Some authenticators only return the secret when the passkey is used, not when it is created.
  const key = prf.results?.first ? await prfToKey(prf.results.first) : await getPasskeyKey(credentialId, prfSalt);

  return { key, credentialId, prfSalt };
};
