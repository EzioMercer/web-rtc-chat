// Their addresses that arrived (through relays) before the offer/answer they belong to, per contact.
// Relays don't keep order, so this happens.
const early = new Map<string, { sid: string; candidates: RTCIceCandidateInit[] }>();

const LIMIT = 100;

export const keepEarlyCandidates = (key: string, sid: string, candidates: RTCIceCandidateInit[]) => {
  const kept = early.get(key);
  const list = kept?.sid === sid ? kept.candidates : [];

  early.set(key, { sid, candidates: [...list, ...candidates].slice(0, LIMIT) });
};

// The ones kept for this offer/answer, removed.
export const takeEarlyCandidates = (key: string, sid: string): RTCIceCandidateInit[] => {
  const kept = early.get(key);

  if (kept?.sid !== sid) {
    return [];
  }

  early.delete(key);

  return kept.candidates;
};
