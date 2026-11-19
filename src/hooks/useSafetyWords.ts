import { useEffect, useState } from 'react';
import { vault } from '../identity/vault.ts';
import { safetyWords } from '../signaling/safetyWords.ts';

// The safety words for a contact: the same on both sides, computed from both identity keys.
export const useSafetyWords = (identity: string | undefined): string[] | null => {
  const [words, setWords] = useState<{ identity: string; words: string[] } | null>(null);

  useEffect(() => {
    if (!identity) {
      return;
    }

    let cancelled = false;

    void safetyWords(vault.publicKey, identity).then((result) => {
      if (!cancelled) {
        setWords({ identity, words: result });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [identity]);

  return words && words.identity === identity ? words.words : null;
};
