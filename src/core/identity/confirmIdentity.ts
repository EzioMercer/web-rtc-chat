import { openDataKey } from './openDataKey.ts';
import { vault } from './vault.ts';

// Asks for the passkey (or checks the passphrase) again before something sensitive, such as exporting every chat:
// someone holding the unlocked device for a moment must not be able to. Throws if it doesn't match.
export const confirmIdentity = async (passphrase?: string) => {
  if (vault.meta) {
    await openDataKey(vault.meta, passphrase);
  }
};
