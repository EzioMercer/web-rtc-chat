import { addMessage } from '../store/chat/chatSlice.ts';
import type { AppDispatch } from '../store/store.ts';
import { receiveCallSignal } from '../store/thunks/call/receiveCallSignal.ts';
import { handleCandidate } from './handleCandidate.ts';
import { handleDescription } from './handleDescription.ts';
import type { ControlMessage } from './types.ts';

// Routes a message received on the control channel.
export const handleControlMessage = (data: unknown, dispatch: AppDispatch) => {
  let message: ControlMessage;

  try {
    message = JSON.parse(String(data)) as ControlMessage;
  } catch {
    return;
  }

  switch (message.t) {
    case 'text':
      dispatch(addMessage({ from: 'peer', text: String(message.text) }));
      break;
    case 'sdp':
      handleDescription(message.description).catch(err => console.error('Could not apply description', err));
      break;
    case 'ice':
      void handleCandidate(message.candidate);
      break;
    case 'call':
      dispatch(receiveCallSignal(message));
      break;
  }
};
