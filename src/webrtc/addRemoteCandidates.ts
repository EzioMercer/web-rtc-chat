import { describeCandidateList } from './describeCandidateList.ts';
import { errorText } from './errorText.ts';
import type { Session } from './types.ts';

// Adds addresses of theirs that came through relays. Needs their offer/answer applied first.
export const addRemoteCandidates = async (session: Session, candidates: RTCIceCandidateInit[]) => {
  if (!candidates.length) {
    return;
  }

  session.log(`Got more of their addresses: ${describeCandidateList(candidates)}`);

  for (const candidate of candidates) {
    try {
      await session.peer.addIceCandidate(candidate);
    } catch (err) {
      session.log(`Could not add a network address: ${errorText(err)}`);
    }
  }
};
