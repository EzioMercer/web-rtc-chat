import { b64ToBytes } from '../crypto/b64ToBytes.ts';

// A 32-byte base64url secret.
export const isSecret = (value: unknown): value is string => {
  try {
    return typeof value === 'string' && b64ToBytes(value).length === 32;
  } catch {
    return false;
  }
};
