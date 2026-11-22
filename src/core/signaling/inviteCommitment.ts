import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { sha256 } from '../crypto/sha256.ts';

// What an invite link shows instead of the inviter's key: its hash. The joiner has to send their own key before the
// inviter reveals this one, so nobody can pick a key that gives a wanted safety code. The key is new for each
// invite, so nobody knows it beforehand and the hash can't be searched for.
export const inviteCommitment = async (key: string): Promise<string> => bytesToB64(
  await sha256(`web-rtc-chat invite|${key}`),
);
