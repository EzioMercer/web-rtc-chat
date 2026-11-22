import { type SignalMessage, SignalType } from '../../../core/signaling/types.ts';
import { addRemoteCandidates } from '../../../core/webrtc/addRemoteCandidates.ts';
import { keepEarlyCandidates } from '../../../core/webrtc/earlyCandidates.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import type { AppThunk } from '../../store.ts';

type Ice = Extract<SignalMessage, { t: SignalType.Ice }>;

const MAX_CANDIDATES = 50;

const isCandidate = (value: unknown): value is RTCIceCandidateInit => (
  typeof value === 'object' && value !== null && typeof (value as RTCIceCandidateInit).candidate === 'string'
);

// More of the contact's addresses, sent through relays before the direct connection opened.
export const receiveCandidates = (id: string, msg: Ice): AppThunk<Promise<void>> => async () => {
  if (typeof msg.sid !== 'string' || !Array.isArray(msg.candidates)) {
    return;
  }

  const candidates = msg.candidates.filter(isCandidate).slice(0, MAX_CANDIDATES);
  const session = sessions.get(id);

  if (session?.sid === msg.sid && session.peer.remoteDescription) {
    await addRemoteCandidates(session, candidates);

    return;
  }

  // Their offer/answer hasn't arrived or been applied yet.
  keepEarlyCandidates(id, msg.sid, candidates);
};
