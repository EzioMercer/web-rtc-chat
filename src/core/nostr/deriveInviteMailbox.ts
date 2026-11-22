import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import { hkdf } from '../crypto/hkdf.ts';
import { keysFromSeed } from './keysFromSeed.ts';
import type { MailboxKeys } from './types.ts';

// The mailbox where an invite's owner waits for the reply.
export const deriveInviteMailbox = async (inviteSecret: string): Promise<MailboxKeys> => keysFromSeed(
  await hkdf(b64ToBytes(inviteSecret), 'invite'),
);
