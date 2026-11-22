import { vault } from '../identity/vault.ts';

// Whether this identity saves anything on the device (temporary ones keep everything in memory).
export const isSaving = () => vault.meta !== null && vault.vaultKey !== null;
