import { MOVE_SETUP_MS, MOVE_SWITCH_MS, MOVE_TEST_MS } from '../../../core/webrtc/config.ts';
import { createMoveLink } from '../../../core/webrtc/createMoveLink.ts';
import { senderKind } from '../../../core/webrtc/senderKind.ts';
import { sendMove } from '../../../core/webrtc/sendMove.ts';
import { type Session, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import { CallStatus } from '../../call/types.ts';
import type { AppThunk } from '../../store.ts';
import { endMove } from './endMove.ts';

// The leader asks to test a direct connection for our call: say yes, with what our call sends.
export const acceptMove = (session: Session, id: string): AppThunk => (dispatch, getState) => {
  const { status, key } = getState().call;

  if (session.move || status !== CallStatus.Active || key !== session.key) {
    sendMove(session.key, { step: MoveStep.Abort, id });

    return;
  }

  // The leader ends its attempt sooner; this only cleans up if its messages stop.
  const timer = window.setTimeout(
    () => dispatch(endMove(session, id, 'The direct connection test didn\'t finish', false)),
    MOVE_SETUP_MS + MOVE_TEST_MS + MOVE_SWITCH_MS,
  );

  session.move = {
    id,
    phase: MovePhase.Connecting,
    other: createMoveLink(session, dispatch),
    pairs: [],
    theirs: [],
    lastPong: 0,
    timers: [timer],
  };

  session.log('They test a direct connection next to the TURN relay…');
  sendMove(session.key, { step: MoveStep.Ready, id, kinds: session.senders.map(s => senderKind(session.peer, s)) });
};
