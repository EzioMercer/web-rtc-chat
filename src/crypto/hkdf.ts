import { utf8 } from './utf8.ts';

// Derives 32 bytes from `secret` for the purpose named by `info` (HKDF-SHA256).
export const hkdf = async (secret: Uint8Array<ArrayBuffer>, info: string): Promise<Uint8Array<ArrayBuffer>> => {
  const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8('web-rtc-chat'), info: utf8(info) },
    key,
    256,
  );

  return new Uint8Array(bits);
};
