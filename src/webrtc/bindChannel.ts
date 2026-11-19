import { addMessage } from '../store/chat/chatSlice.ts';
import { connected, disconnected } from '../store/connection/connectionSlice.ts';
import type { AppDispatch } from '../store/store.ts';
import { rtc } from './state.ts';

// Makes `channel` the chat channel and mirrors its events into the store.
export const bindChannel = (channel: RTCDataChannel, dispatch: AppDispatch) => {
  rtc.channel = channel;

  channel.onopen = () => {
    dispatch(connected());
    dispatch(addMessage({ from: 'system', text: 'Connected. Say hi!' }));
  };

  channel.onclose = () => {
    dispatch(disconnected());
    dispatch(addMessage({ from: 'system', text: 'Connection closed.' }));
  };

  channel.onmessage = (e: MessageEvent) => {
    dispatch(addMessage({ from: 'peer', text: String(e.data) }));
  };
};
