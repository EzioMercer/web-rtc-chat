import { sendSignal } from '../../../core/signaling/sendSignal.ts';
import { CANDIDATES_PER_EVENT, LATE_CANDIDATE_BATCH_MS } from '../../../core/webrtc/config.ts';
import { describeCandidateList } from '../../../core/webrtc/describeCandidateList.ts';
import { errorText } from '../../../core/webrtc/errorText.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import type { Session } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';

// An address of ours found after the offer/answer went out, before the direct connection opened.
// Addresses found close together go through the relays in one event.
export const relayCandidate = (session: Session, candidate: RTCIceCandidateInit): AppThunk => (_, getState) => {
  session.lateCandidates.push(candidate);

  if (session.lateTimer !== null) {
    return;
  }

  session.lateTimer = window.setTimeout(() => {
    session.lateTimer = null;

    const candidates = session.lateCandidates.splice(0);
    const contact = getState().contacts.list.find(c => c.id === session.key);

    if (!contact || sessions.get(session.key) !== session || session.opened || !candidates.length) {
      return;
    }

    session.log(`Sending more of our addresses through the relays: ${describeCandidateList(candidates)}`);

    for (let i = 0; i < candidates.length; i += CANDIDATES_PER_EVENT) {
      const chunk = candidates.slice(i, i + CANDIDATES_PER_EVENT);

      sendSignal(contact, { t: 'ice', sid: session.sid, candidates: chunk })
        .catch((err: unknown) => session.log(`Could not send addresses: ${errorText(err)}`));
    }
  }, LATE_CANDIDATE_BATCH_MS);
};
