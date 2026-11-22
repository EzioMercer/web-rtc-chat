import { sessions } from './state.ts';
import type { ControlMessage } from './types.ts';

// Sends a message over the control channel of `key`'s connection. Returns whether it was sent.
export const sendControl = (key: string, message: ControlMessage): boolean => {
  const channel = sessions.get(key)?.channel;

  if (channel?.readyState !== 'open') {
    return false;
  }

  channel.send(JSON.stringify(message));

  return true;
};
