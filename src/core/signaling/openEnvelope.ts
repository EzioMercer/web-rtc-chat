import { unzipText } from '../compression/unzipText.ts';
import { verifyText } from '../identity/verifyText.ts';
import { vault } from '../identity/vault.ts';
import { MAX_SKEW_S } from '../nostr/config.ts';
import type { Envelope, SignedBody } from './types.ts';

const seenNonces = new Map<string, number>();

const isFresh = (ts: number, nonce: string): boolean => {
  const now = Math.floor(Date.now() / 1000);

  seenNonces.forEach((seenAt, key) => {
    if (now - seenAt > MAX_SKEW_S * 2) {
      seenNonces.delete(key);
    }
  });

  if (Math.abs(now - ts) > MAX_SKEW_S || seenNonces.has(nonce)) {
    return false;
  }

  seenNonces.set(nonce, now);

  return true;
};

// Unzips and checks a received signal (see sealEnvelope): addressed to `expectedTo` (us, unless it answers an
// invite), fresh, not replayed, and signed by `from` (`expectedFrom` when we know who must have sent it). Returns
// null for anything else.
export const openEnvelope = async (
  text: string,
  expectedFrom: string | null,
  expectedTo = vault.publicKey,
): Promise<SignedBody | null> => {
  try {
    const { body, sig } = JSON.parse(await unzipText(text)) as Envelope;
    const parsed = JSON.parse(body) as SignedBody;

    if (parsed.to !== expectedTo || typeof parsed.from !== 'string' || !parsed.msg) {
      return null;
    }

    if (expectedFrom !== null && parsed.from !== expectedFrom) {
      return null;
    }

    if (!(await verifyText(parsed.from, body, sig)) || !isFresh(parsed.ts, parsed.nonce)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
