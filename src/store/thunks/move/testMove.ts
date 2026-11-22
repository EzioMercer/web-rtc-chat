import { MOVE_PING_LIMIT_MS, MOVE_PING_MS, MOVE_TEST_MS } from '../../../core/webrtc/config.ts';
import { isWorking } from '../../../core/webrtc/isWorking.ts';
import { type ControlMessage, type Session, ControlType, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';
import { endMove } from './endMove.ts';
import { switchMove } from './switchMove.ts';

// The new connection opened (leader): ping the other side over it for a while. Every answer must come in time,
// and the path must stay up the whole time; then the call moves.
export const testMove = (session: Session, id: string): AppThunk => (dispatch) => {
  const { move } = session;

  if (!move || move.id !== id || move.phase !== MovePhase.Connecting) {
    return;
  }

  const started = Date.now();
  const ping: ControlMessage = { t: ControlType.Move, step: MoveStep.Ping, id };

  move.phase = MovePhase.Testing;
  move.lastPong = started;
  move.timers.forEach(timer => window.clearTimeout(timer));
  session.log('The direct connection opened; testing it…');

  const timer = window.setInterval(() => {
    const { peer, channel } = move.other;
    const now = Date.now();

    if (session.move !== move || move.phase !== MovePhase.Testing) {
      window.clearInterval(timer);
    } else if (now - move.lastPong > MOVE_PING_LIMIT_MS || channel?.readyState !== 'open' || !isWorking(peer)) {
      dispatch(endMove(session, id, 'The direct connection wasn\'t steady', true));
    } else if (now - started >= MOVE_TEST_MS) {
      window.clearInterval(timer);
      void dispatch(switchMove(session, id));
    } else {
      channel.send(JSON.stringify(ping));
    }
  }, MOVE_PING_MS);

  move.timers = [timer];
};
