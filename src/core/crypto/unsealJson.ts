import type { Sealed } from './types.ts';
import { unseal } from './unseal.ts';

export const unsealJson = async <T>(key: CryptoKey, sealed: Sealed): Promise<T> => JSON.parse(
  new TextDecoder().decode(await unseal(key, sealed)),
) as T;
