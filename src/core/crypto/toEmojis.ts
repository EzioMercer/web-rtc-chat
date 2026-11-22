import { EMOJIS } from './emojis.ts';
import type { SafetyEmoji } from './types.ts';

// Turns the first `count` bytes into emojis (256 in the list, so one byte picks one).
export const toEmojis = (bytes: Uint8Array, count: number): SafetyEmoji[] => [...bytes.subarray(0, count)]
  .map(byte => EMOJIS[byte]);
