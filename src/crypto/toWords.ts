import { wordlist } from '@scure/bip39/wordlists/english.js';

// Reads `count` 11-bit numbers from `bytes` and turns each into a word (2048-word list).
export const toWords = (bytes: Uint8Array, count: number): string[] => {
  const words: string[] = [];
  let acc = 0;
  let bits = 0;
  let i = 0;

  while (words.length < count && i < bytes.length) {
    acc = (acc << 8) | bytes[i];
    bits += 8;
    i += 1;

    if (bits >= 11) {
      bits -= 11;
      words.push(wordlist[(acc >> bits) & 2047]);
    }
  }

  return words;
};
