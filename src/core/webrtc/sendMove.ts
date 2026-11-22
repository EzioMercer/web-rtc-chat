import { sendControl } from './sendControl.ts';
import { type MoveSignal, ControlType } from './types.ts';

// Sends a step of moving the call (see store/thunks/move) over the control channel in use.
export const sendMove = (key: string, signal: Omit<MoveSignal, 't'>) => sendControl(
  key,
  { t: ControlType.Move, ...signal },
);
