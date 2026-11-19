import { sendControl } from '../../../webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';

// Tells the peer whether our microphone and camera are on, so it can show it.
export const sendCallState = (): AppThunk => (_dispatch, getState) => {
  const { mic, cam, video } = getState().call;

  sendControl({ t: 'call', action: 'state', mic, cam: video && cam });
};
