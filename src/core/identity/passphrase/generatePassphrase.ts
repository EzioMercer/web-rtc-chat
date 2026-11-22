import { toWords } from '../../crypto/toWords.ts';
import { randomBytes } from '../../crypto/randomBytes.ts';

// 5 random words from a 2048-word list: 55 bits, plenty with Argon2id.
export const generatePassphrase = (): string => toWords(randomBytes(16), 5).join(' ');
