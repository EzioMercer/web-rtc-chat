import type { AppDispatch } from '../store/store.ts';
import { receiveCallSignal } from '../store/thunks/call/receiveCallSignal.ts';
import { receivePeerText } from '../store/thunks/chat/receivePeerText.ts';
import { receiveRotate } from '../store/thunks/contact/receiveRotate.ts';
import { handleCandidate } from './handleCandidate.ts';
import { handleDescription } from './handleDescription.ts';
import { sessions } from './state.ts';
import type { ControlMessage } from './types.ts';

// Routes a message received on `key`'s control channel.
export const handleControlMessage = (key: string, data: unknown, dispatch: AppDispatch) => {
  let message: ControlMessage;

  try {
    message = JSON.parse(String(data)) as ControlMessage;
  } catch {
    return;
  }

  switch (message.t) {
    case 'text':
      dispatch(receivePeerText(key, String(message.text)));
      break;
    case 'sdp':
      handleDescription(key, message.description).catch(() => undefined);
      break;
    case 'ice':
      void handleCandidate(key, message.candidate);
      break;
    case 'call':
      if (message.action !== 'state') {
        sessions.get(key)?.log(`Call: they sent "${message.action}"`);
      }

      dispatch(receiveCallSignal(key, message));
      break;
    case 'rotate':
    case 'rotate-ack':
    case 'rotate-done':
      dispatch(receiveRotate(key, message));
      break;
  }
};
