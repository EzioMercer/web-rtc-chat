import { useEffect, useState } from 'react';
import { vault } from '../../core/identity/vault.ts';
import type { SafetyEmoji } from '../../core/crypto/types.ts';
import { inviteSafetyCode } from '../../core/signaling/inviteSafetyCode.ts';
import { keySafetyCode } from '../../core/signaling/keySafetyCode.ts';

// A contact's safety code, the same on both sides: the one saved when we added each other, or, for contacts added
// before that existed, one made from both identity keys.
export const useSafetyCode = (identity: string | undefined, safety: string | undefined): SafetyEmoji[] | null => {
  const [fromKeys, setFromKeys] = useState<{ identity: string; code: SafetyEmoji[] } | null>(null);

  useEffect(() => {
    if (!identity || safety) {
      return;
    }

    let cancelled = false;

    void keySafetyCode(vault.publicKey, identity).then((code) => {
      if (!cancelled) {
        setFromKeys({ identity, code });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [identity, safety]);

  if (safety) {
    return inviteSafetyCode(safety);
  }

  return fromKeys && fromKeys.identity === identity ? fromKeys.code : null;
};
