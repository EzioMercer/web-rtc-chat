import { profileHash } from './profileHash.ts';
import type { ProfileInfo } from './types.ts';

// The fingerprint of our phone and description together. Empty when we have neither.
export const infoHash = ({ phone, about }: ProfileInfo) => (
  profileHash(phone || about ? JSON.stringify([phone, about]) : '')
);
