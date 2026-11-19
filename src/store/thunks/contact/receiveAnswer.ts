import type { SignalMessage } from '../../../signaling/types.ts';
import { sessions } from '../../../webrtc/state.ts';
import type { AppThunk } from '../../store.ts';

type Answer = Extract<SignalMessage, { t: 'answer' }>;

// The contact answered our offer: the direct connection opens next.
export const receiveAnswer = (id: string, answer: Answer): AppThunk<Promise<void>> => async () => {
  const session = sessions.get(id);

  if (session?.sid !== answer.sid || session.peer.signalingState !== 'have-local-offer') {
    return;
  }

  try {
    await session.peer.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
  } catch (err) {
    console.error('Could not apply answer', err);
  }
};
