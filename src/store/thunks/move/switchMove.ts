import { MOVE_SWITCH_MS } from '../../../core/webrtc/config.ts';
import { sameSenders } from '../../../core/webrtc/sameSenders.ts';
import { sendMove } from '../../../core/webrtc/sendMove.ts';
import { type Session, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';
import { endMove } from './endMove.ts';

// The test passed (leader): our call goes out on the new connection too, and the other side is told to move over.
// Until it has, ours still goes out on the old one, so they hear us all the time.
export const switchMove = (session: Session, id: string): AppThunk<Promise<void>> => async (dispatch) => {
  const { move } = session;

  if (!move || move.id !== id || move.phase !== MovePhase.Testing) {
    return;
  }

  if (!sameSenders(session, move)) {
    dispatch(endMove(session, id, 'Our call changed during the direct connection test', true));

    return;
  }

  move.phase = MovePhase.Switching;

  try {
    await Promise.all(move.pairs.map(([current, next]) => next.replaceTrack(current.track)));
  } catch {
    dispatch(endMove(session, id, 'Could not send the call on the direct connection', true));

    return;
  }

  move.timers.push(window.setTimeout(
    () => dispatch(endMove(session, id, 'They didn\'t move over in time', true)),
    MOVE_SWITCH_MS,
  ));
  sendMove(session.key, { step: MoveStep.Switch, id });
};
