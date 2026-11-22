import { nanoid } from 'nanoid';
import { MOVE_SETUP_MS } from '../../../core/webrtc/config.ts';
import { createMoveLink } from '../../../core/webrtc/createMoveLink.ts';
import { sendMove } from '../../../core/webrtc/sendMove.ts';
import { type Session, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';
import { endMove } from './endMove.ts';

// A call goes through the TURN relay: open a direct connection next to it, test it, and only then move the call
// over (the leader's side; the other side answers). How it goes on: receiveMove.
export const startMove = (session: Session): AppThunk => (dispatch) => {
  if (session.move || session.channel?.readyState !== 'open') {
    return;
  }

  const id = nanoid();
  const timer = window.setTimeout(
    () => dispatch(endMove(session, id, 'No direct connection opened in time', true)),
    MOVE_SETUP_MS,
  );

  session.move = {
    id,
    phase: MovePhase.Asking,
    other: createMoveLink(session, dispatch),
    pairs: [],
    theirs: [],
    lastPong: 0,
    timers: [timer],
  };

  session.log('Testing a direct connection next to the TURN relay…');
  sendMove(session.key, { step: MoveStep.Ask, id });
};
