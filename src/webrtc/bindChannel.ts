import { addMessage } from '../store/chat/chatSlice.ts';
import { connected, disconnected } from '../store/connection/connectionSlice.ts';
import type { AppDispatch } from '../store/store.ts';
import { endCall } from '../store/thunks/call/endCall.ts';
import { handleControlMessage } from './handleControlMessage.ts';
import { rtc } from './state.ts';

// Makes `channel` the control channel and mirrors its events into the store.
export const bindChannel = (channel: RTCDataChannel, dispatch: AppDispatch) => {
  rtc.channel = channel;

  channel.onopen = () => {
    dispatch(connected());
    dispatch(addMessage({ from: 'system', text: 'Connected. Say hi!' }));
  };

  channel.onclose = () => {
    dispatch(endCall('Call ended.'));
    dispatch(disconnected());
    dispatch(addMessage({ from: 'system', text: 'Connection closed.' }));
  };

  channel.onmessage = (e: MessageEvent) => handleControlMessage(e.data, dispatch);
};
