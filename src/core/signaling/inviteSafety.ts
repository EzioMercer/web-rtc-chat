import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { sha256 } from '../crypto/sha256.ts';

// The safety code of a contact (base64url), the same on both sides: both keys, which are new for this contact, so
// nobody could know it in advance. Saved with the contact.
export const inviteSafety = async (inviter: string, joiner: string): Promise<string> => bytesToB64(
  await sha256(['web-rtc-chat invite safety', inviter, joiner].join('|')),
);
