import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import { toEmojis } from '../crypto/toEmojis.ts';
import type { SafetyEmoji } from '../crypto/types.ts';
import { INVITE_CODE_LENGTH } from './config.ts';

// The emojis for a contact's saved invite safety code (see inviteSafety).
export const inviteSafetyCode = (safety: string): SafetyEmoji[] => toEmojis(b64ToBytes(safety), INVITE_CODE_LENGTH);
