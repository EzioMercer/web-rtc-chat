import { describeCandidates } from './describeCandidates.ts';

// "1 public" for a list of ICE candidates (see describeCandidates).
export const describeCandidateList = (candidates: RTCIceCandidateInit[]): string => (
  describeCandidates(candidates.map(c => `a=${c.candidate ?? ''}`).join('\n'))
);
