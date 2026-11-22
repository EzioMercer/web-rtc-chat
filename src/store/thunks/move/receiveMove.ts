import { sessions } from '../../../core/webrtc/state.ts';
import { type MoveSignal, MovePhase, MoveStep, ControlType } from '../../../core/webrtc/types.ts';
import { errorText } from '../../../core/webrtc/errorText.ts';
import type { AppThunk } from '../../store.ts';
import { acceptMove } from './acceptMove.ts';
import { answerMove } from './answerMove.ts';
import { endMove } from './endMove.ts';
import { moveBack } from './moveBack.ts';
import { moveOver } from './moveOver.ts';
import { offerMove } from './offerMove.ts';

// A step of moving the call to a new, direct connection, from the other side (see startMove).
export const receiveMove = (key: string, signal: MoveSignal): AppThunk<Promise<void>> => async (dispatch) => {
  const session = sessions.get(key);
  const { step, id, sdp, kinds } = signal;

  if (!session || typeof id !== 'string') {
    return;
  }

  if (step === MoveStep.Ask) {
    dispatch(acceptMove(session, id));

    return;
  }

  const { move } = session;

  if (!move || move.id !== id) {
    return;
  }

  try {
    switch (step) {
      case MoveStep.Ready:
        await dispatch(offerMove(session, move, Array.isArray(kinds) ? kinds : []));
        break;
      case MoveStep.Offer:
        if (typeof sdp === 'string') {
          await dispatch(answerMove(session, move, sdp, Array.isArray(kinds) ? kinds.length : 0));
        }

        break;
      case MoveStep.Answer:
        if (typeof sdp === 'string' && move.other.peer.signalingState === 'have-local-offer') {
          await move.other.peer.setRemoteDescription({ type: 'answer', sdp });
        }

        break;
      case MoveStep.Ping:
        if (move.other.channel?.readyState === 'open') {
          move.other.channel.send(JSON.stringify({ t: ControlType.Move, step: MoveStep.Pong, id }));
        }

        break;
      case MoveStep.Pong:
        move.lastPong = Date.now();
        break;
      case MoveStep.Switch:
      case MoveStep.Done:
        await dispatch(moveOver(session, id));
        break;
      case MoveStep.Back:
        await dispatch(moveBack(session, false));
        break;
      case MoveStep.Abort:
        if (move.phase === MovePhase.Holding) {
          await dispatch(moveBack(session, false));
        } else {
          dispatch(endMove(session, id, 'They ended the direct connection test', false));
        }

        break;
    }
  } catch (err) {
    dispatch(endMove(session, id, `The direct connection test failed (${errorText(err)})`, true));
  }
};
