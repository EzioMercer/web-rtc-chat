import { bindChannel } from '../../../core/webrtc/bindChannel.ts';
import { MOVE_HOLD_MS } from '../../../core/webrtc/config.ts';
import { sameSenders } from '../../../core/webrtc/sameSenders.ts';
import { sendMove } from '../../../core/webrtc/sendMove.ts';
import { swapLink } from '../../../core/webrtc/swapLink.ts';
import { type Session, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import { remoteStreamChanged } from '../../call/callSlice.ts';
import type { AppThunk } from '../../store.ts';
import { checkRoute } from '../session/checkRoute.ts';
import { closeOldLink } from './closeOldLink.ts';
import { endMove } from './endMove.ts';

// The call moves to the new connection: on the other side when the leader says "switch", on the leader's when
// the other side says it has. Our call stops going out on the old connection, and we play theirs from the new
// one. The old connection stays open, idle, to go back to if the new one breaks soon (see moveBack).
export const moveOver = (session: Session, id: string): AppThunk<Promise<void>> => async (dispatch) => {
  const { move } = session;
  const leader = !session.polite;
  const ready = leader ? MovePhase.Switching : MovePhase.Connecting;

  if (!move || move.id !== id || move.phase !== ready || move.other.channel?.readyState !== 'open') {
    return;
  }

  if (!leader) {
    if (!sameSenders(session, move)) {
      dispatch(endMove(session, id, 'Our call changed during the direct connection test', true));

      return;
    }

    await Promise.all(move.pairs.map(([current, next]) => next.replaceTrack(current.track).catch(() => undefined)));

    if (session.move !== move) {
      return;
    }
  }

  move.timers.forEach(timer => window.clearTimeout(timer));
  move.timers = [];

  const screen = move.pairs.find(([current]) => current === session.screenSender);

  move.other.senders = move.pairs.map(([, next]) => next);
  move.other.screenSender = screen?.[1] ?? null;
  move.other.remoteStream = new MediaStream(move.theirs.map(t => t.receiver.track));
  move.theirs = [];
  move.phase = MovePhase.Holding;
  swapLink(session, move);

  if (session.channel) {
    bindChannel(session, session.channel, dispatch);
  }

  // The previous connection's senders: [current, previous] after the swap.
  move.pairs.forEach(([, previous]) => void previous.replaceTrack(null).catch(() => undefined));

  const { peer } = session;

  peer.sctp?.transport.iceTransport.addEventListener('selectedcandidatepairchange', () => {
    if (session.peer === peer) {
      void dispatch(checkRoute(session));
    }
  });

  session.restartedAt = Date.now();
  session.log('The call moved to the direct connection (the TURN one stays for a moment, in case).');
  dispatch(remoteStreamChanged());

  if (!leader) {
    sendMove(session.key, { step: MoveStep.Done, id });
  }

  move.timers.push(window.setTimeout(() => dispatch(closeOldLink(session, id)), MOVE_HOLD_MS));
  await dispatch(checkRoute(session));
};
