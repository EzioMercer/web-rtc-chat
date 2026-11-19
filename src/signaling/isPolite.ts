import { vault } from '../identity/vault.ts';

// Exactly one side of every pair is polite: it yields when both sides send offers at the same time.
export const isPolite = (theirIdentity: string): boolean => vault.publicKey < theirIdentity;
