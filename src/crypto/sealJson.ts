import { seal } from './seal.ts';
import type { Sealed } from './types.ts';
import { utf8 } from './utf8.ts';

export const sealJson = (key: CryptoKey, value: unknown): Promise<Sealed> => seal(key, utf8(JSON.stringify(value)));
