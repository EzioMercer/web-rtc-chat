import { isWorking } from '../../../core/webrtc/isWorking.ts';
import { sameSenders } from '../../../core/webrtc/sameSenders.ts';
import { sendMove } from '../../../core/webrtc/sendMove.ts';
import { swapLink } from '../../../core/webrtc/swapLink.ts';
import { type Session, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import { remoteStreamChanged } from '../../call/callSlice.ts';
import { CallStatus } from '../../call/types.ts';
import type { AppThunk } from '../../store.ts';
import { checkRoute } from '../session/checkRoute.ts';
import { rescuePath } from '../session/rescuePath.ts';
import { sessionDropped } from '../session/sessionDropped.ts';

// The new connection broke soon after the call moved to it: move the call back to the old one, which was kept for
// this. `tell`: let the other side know (it may not have noticed yet).
export const moveBack = (session: Session, tell: boolean): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { move } = session;

  if (!move || move.phase !== MovePhase.Holding) {
    return;
  }

  move.timers.forEach(timer => window.clearTimeout(timer));
  session.move = null;

  const old = move.other;
  const { status, key } = getState().call;
  const inCall = status !== CallStatus.Idle && key === session.key;

  // A call that changed on the new connection (e.g. a screen was added) can't go back.
  if (!isWorking(old.peer) || old.channel?.readyState !== 'open' || (inCall && !sameSenders(session, move))) {
    old.channel?.close();
    old.peer.close();
    session.log('The direct connection broke soon after the move, and the old one is no use any more.');

    // As without a move: look for a new path, or start over.
    if (session.channel?.readyState === 'open') {
      void dispatch(rescuePath(session));
    } else {
      dispatch(sessionDropped(session));
    }

    return;
  }

  swapLink(session, move);

  const broken = move.other;

  if (inCall) {
    // [current, broken] after the swap: our call goes out on the old connection again.
    move.pairs.forEach(([current, previous]) => void current.replaceTrack(previous.track).catch(() => undefined));
  } else {
    session.senders = [];
    session.screenSender = null;
    session.remoteStream = null;
  }

  broken.channel?.close();
  broken.peer.close();
  session.restartedAt = Date.now();
  session.log('The direct connection broke soon after the move; the call is back on the TURN relay.');
  dispatch(remoteStreamChanged());

  if (tell) {
    sendMove(session.key, { step: MoveStep.Back, id: move.id });
  }

  await dispatch(checkRoute(session));
};
