import { sha256 } from '../crypto/sha256.ts';
import { toWords } from '../crypto/toWords.ts';

// 4 words that both sides compute the same way from their two keys (or certificate fingerprints).
// If someone is in the middle, the two screens show different words.
export const safetyWords = async (a: string, b: string): Promise<string[]> => toWords(
  await sha256(['web-rtc-chat safety', ...[a, b].sort()].join('|')),
  4,
);
