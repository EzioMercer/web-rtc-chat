import { b64ToBytes } from '../../crypto/b64ToBytes.ts';
import { randomBytes } from '../../crypto/randomBytes.ts';
import { prfToKey } from './prfToKey.ts';

// Asks for the fingerprint, face or PIN, and gets the passkey's stable secret for `prfSalt`.
export const getPasskeyKey = async (credentialId: string, prfSalt: string): Promise<CryptoKey> => {
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: b64ToBytes(credentialId) }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: b64ToBytes(prfSalt) } } },
    },
  }) as PublicKeyCredential | null;

  const first = credential?.getClientExtensionResults().prf?.results?.first;

  if (!first) {
    throw new Error('This passkey can\'t be used for encryption on this device.');
  }

  return prfToKey(first);
};
