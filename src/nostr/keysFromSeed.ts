import { getPublicKey } from 'nostr-tools/pure';
import type { MailboxKeys } from './types.ts';

export const keysFromSeed = (seed: Uint8Array): MailboxKeys => ({ sk: seed, pk: getPublicKey(seed) });
