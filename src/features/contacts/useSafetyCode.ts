import type { SafetyEmoji } from '../../core/crypto/types.ts';
import { inviteSafetyCode } from '../../core/signaling/inviteSafetyCode.ts';

// A contact's safety code, the same on both sides: the one worked out when we added each other.
export const useSafetyCode = (safety: string | undefined): SafetyEmoji[] | null => (
  safety ? inviteSafetyCode(safety) : null
);
