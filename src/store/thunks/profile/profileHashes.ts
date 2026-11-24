import { infoHash } from '../../../core/profile/infoHash.ts';
import { profileHash } from '../../../core/profile/profileHash.ts';
import type { ProfileState } from '../../profile/types.ts';

// The hashes of our profile's two parts, as a ProfileSignal carries them.
export const profileHashes = async ({ picture, phone, about }: ProfileState) => ({
  pictureHash: await profileHash(picture),
  infoHash: await infoHash({ phone, about }),
});
