import type { AppDispatch } from '../../store/store.ts';
import { moveBack } from '../../store/thunks/move/moveBack.ts';
import { sessionDropped } from '../../store/thunks/session/sessionDropped.ts';
import { sessionOpened } from '../../store/thunks/session/sessionOpened.ts';
import { handleControlMessage } from './handleControlMessage.ts';
import { type Session, MovePhase } from './types.ts';

// Makes `channel` the session's control channel and mirrors its events into the store.
export const bindChannel = (session: Session, channel: RTCDataChannel, dispatch: AppDispatch) => {
  session.channel = channel;
  channel.onopen = () => dispatch(sessionOpened(session));
  channel.onmessage = (e: MessageEvent) => handleControlMessage(session.key, e.data, dispatch);

  channel.onclose = () => {
    // The channel of a connection the call moved away from: nothing is lost.
    if (session.channel !== channel) {
      return;
    }

    // Right after a move, the old connection is still there to go back to.
    if (session.move?.phase === MovePhase.Holding) {
      void dispatch(moveBack(session, true));
    } else {
      dispatch(sessionDropped(session));
    }
  };
};
