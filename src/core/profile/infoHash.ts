import { profileHash } from './profileHash.ts';
import type { ProfileInfo } from './types.ts';

// The fingerprint of our phone, description and birthday together. Empty when we have none of them.
export const infoHash = ({ phone, about, birthday }: ProfileInfo) => (
  profileHash(phone || about || birthday ? JSON.stringify([phone, about, birthday]) : '')
);
