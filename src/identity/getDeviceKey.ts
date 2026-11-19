import { kv } from '../storage/kv.ts';
import { STORAGE_KEYS } from './storageKeys.ts';

// "No protection": a non-extractable AES key kept in browser storage. Anyone with the device's files can use it.
export const getDeviceKey = async (create: boolean): Promise<CryptoKey> => {
  const stored = await kv.get<CryptoKey>(STORAGE_KEYS.deviceKey);

  if (stored) {
    return stored;
  }

  if (!create) {
    throw new Error('The device key is missing.');
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

  await kv.set(STORAGE_KEYS.deviceKey, key);

  return key;
};
