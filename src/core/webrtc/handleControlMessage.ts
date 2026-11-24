import { messageDelivered } from '../../store/chat/chatSlice.ts';
import type { AppDispatch } from '../../store/store.ts';
import { receiveCallSignal } from '../../store/thunks/call/receiveCallSignal.ts';
import { receivePeerText } from '../../store/thunks/chat/receivePeerText.ts';
import { receiveLocation } from '../../store/thunks/location/receiveLocation.ts';
import { receiveRotate } from '../../store/thunks/contact/receiveRotate.ts';
import { receiveMove } from '../../store/thunks/move/receiveMove.ts';
import { receiveProfile } from '../../store/thunks/profile/receiveProfile.ts';
import { receiveRoute } from '../../store/thunks/session/receiveRoute.ts';
import { handleCandidate } from './handleCandidate.ts';
import { handleDescription } from './handleDescription.ts';
import { sessions } from './state.ts';
import { type ControlMessage, ControlType, CallAction } from './types.ts';

// Routes a message received on `key`'s control channel.
export const handleControlMessage = (key: string, data: unknown, dispatch: AppDispatch) => {
  let message: ControlMessage;

  try {
    message = JSON.parse(String(data)) as ControlMessage;
  } catch {
    return;
  }

  switch (message.t) {
    case ControlType.Text:
      dispatch(receivePeerText(key, String(message.text), message.id, message.waited));
      break;
    case ControlType.Ack:
      if (typeof message.id === 'string') {
        const rev = typeof message.rev === 'number' ? message.rev : undefined;

        dispatch(messageDelivered({ key, id: message.id, rev }));
      }

      break;
    case ControlType.Sdp:
      handleDescription(key, message.description).catch(() => undefined);
      break;
    case ControlType.Ice:
      void handleCandidate(key, message.candidate);
      break;
    case ControlType.Call:
      if (message.action !== CallAction.State) {
        sessions.get(key)?.log(`Call: they sent "${CallAction[message.action]}"`);
      }

      dispatch(receiveCallSignal(key, message));
      break;
    case ControlType.Rotate:
    case ControlType.RotateAck:
    case ControlType.RotateDone:
      dispatch(receiveRotate(key, message));
      break;
    case ControlType.Move:
      void dispatch(receiveMove(key, message));
      break;
    case ControlType.Route:
      void dispatch(receiveRoute(key, message.relay === true));
      break;
    case ControlType.Profile:
    case ControlType.ProfileAsk:
      void dispatch(receiveProfile(key, message));
      break;
    case ControlType.Location:
      dispatch(receiveLocation(key, message));
      break;
  }
};
