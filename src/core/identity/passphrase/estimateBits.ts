import { wordlist } from '@scure/bip39/wordlists/english.js';

const WORDS = new Set(wordlist);

// Rough strength of a passphrase in bits, to warn about weak ones. Not a precise measure.
export const estimateBits = (passphrase: string): number => {
  const trimmed = passphrase.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length > 1 && parts.every(part => WORDS.has(part.toLowerCase()))) {
    return parts.length * 11;
  }

  let pool = 0;

  pool += /[a-z]/.test(trimmed) ? 26 : 0;
  pool += /[A-Z]/.test(trimmed) ? 26 : 0;
  pool += /\d/.test(trimmed) ? 10 : 0;
  pool += /[^a-zA-Z\d]/.test(trimmed) ? 33 : 0;

  // People rarely pick characters at random, so count only half of the theoretical strength.
  return pool ? Math.floor((trimmed.length * Math.log2(pool)) / 2) : 0;
};
