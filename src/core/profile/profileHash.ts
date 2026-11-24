import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { sha256 } from '../crypto/sha256.ts';

// A short fingerprint of a part of our profile (the picture, or the phone and description), so a contact can tell
// whether what they have is still ours without it being sent each time. Empty for nothing.
export const profileHash = async (text: string | null | undefined) => (
  text ? bytesToB64((await sha256(text)).subarray(0, 16)) : ''
);
