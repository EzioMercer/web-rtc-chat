import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import { hkdf } from '../crypto/hkdf.ts';
import { keysFromSeed } from './keysFromSeed.ts';
import type { MailboxKeys } from './types.ts';

// The mailbox where someone who used an invite waits for the inviter to reveal their key.
export const deriveRevealMailbox = async (inviteSecret: string): Promise<MailboxKeys> => keysFromSeed(
  await hkdf(b64ToBytes(inviteSecret), 'invite reveal'),
);
