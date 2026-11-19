import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { randomBytes } from '../crypto/randomBytes.ts';

export const newSecret = (): string => bytesToB64(randomBytes(32));
