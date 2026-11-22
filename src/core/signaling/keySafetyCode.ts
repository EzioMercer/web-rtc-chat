import { sha256 } from '../crypto/sha256.ts';
import { toEmojis } from '../crypto/toEmojis.ts';
import type { SafetyEmoji } from '../crypto/types.ts';
import { KEY_CODE_LENGTH } from './config.ts';

// A safety code made only from two keys (or certificate fingerprints), the same on both sides. If someone is in the
// middle, the two screens show different emojis.
export const keySafetyCode = async (a: string, b: string): Promise<SafetyEmoji[]> => toEmojis(
  await sha256(['web-rtc-chat safety', ...[a, b].sort()].join('|')),
  KEY_CODE_LENGTH,
);
