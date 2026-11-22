import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { sha256 } from '../crypto/sha256.ts';

// What an invite link shows instead of the inviter's key: a hash of the key and a fresh random nonce. The joiner has
// to send their own key and nonce before the inviter reveals these, so nobody can pick a key that gives a wanted
// safety code. The nonce matters because identity keys are long-lived: someone may know the key from before.
export const inviteCommitment = async (identity: string, nonce: string): Promise<string> => bytesToB64(
  await sha256(`web-rtc-chat invite|${identity}|${nonce}`),
);
