import { rtc } from './state.ts';
import type { ControlMessage } from './types.ts';

// Sends a message over the control channel. Returns whether it was sent.
export const sendControl = (message: ControlMessage): boolean => {
  const { channel } = rtc;

  if (channel?.readyState !== 'open') {
    return false;
  }

  channel.send(JSON.stringify(message));

  return true;
};
