import type { SignalMessage } from '../../../signaling/types.ts';
import { sessions } from '../../../webrtc/state.ts';
import { describeCandidates } from '../../../webrtc/describeCandidates.ts';
import { sessionDetail, sessionLogged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';

type Answer = Extract<SignalMessage, { t: 'answer' }>;

// The contact answered our offer: the direct connection opens next.
export const receiveAnswer = (id: string, answer: Answer): AppThunk<Promise<void>> => async (dispatch) => {
  const session = sessions.get(id);

  if (session?.sid !== answer.sid || session.peer.signalingState !== 'have-local-offer') {
    dispatch(sessionLogged({ key: id, text: 'Got an answer to an old attempt; ignored.' }));

    return;
  }

  dispatch(sessionLogged({ key: id, text: `Their addresses: ${describeCandidates(answer.sdp)}` }));

  try {
    await session.peer.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
    dispatch(sessionDetail({ key: id, detail: 'They answered. Opening the direct connection…' }));
  } catch (err) {
    console.error('Could not apply answer', err);
  }
};
