import { MOVE_FILES_CHECK_MS } from '../../../core/webrtc/config.ts';
import { fileChannels } from '../../../core/webrtc/state.ts';
import { type Session, MovePhase } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';

// The new connection has held since the move: close the old one, once no file goes over it any more.
export const closeOldLink = (session: Session, id: string): AppThunk => (dispatch) => {
  const { move } = session;

  if (!move || move.id !== id || move.phase !== MovePhase.Holding) {
    return;
  }

  const { peer, channel } = move.other;

  if ((fileChannels.get(peer)?.size ?? 0) > 0) {
    move.timers = [window.setTimeout(() => dispatch(closeOldLink(session, id)), MOVE_FILES_CHECK_MS)];

    return;
  }

  move.timers.forEach(timer => window.clearTimeout(timer));
  session.move = null;
  channel?.close();
  peer.close();
  session.log('Closed the old TURN relay connection.');
};
