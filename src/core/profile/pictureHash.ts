import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { sha256 } from '../crypto/sha256.ts';

// A short fingerprint of a picture, so a contact can tell whether the one they have is still ours without it being
// sent each time. Empty for no picture.
export const pictureHash = async (picture: string | null | undefined) => (
  picture ? bytesToB64((await sha256(picture)).subarray(0, 16)) : ''
);
