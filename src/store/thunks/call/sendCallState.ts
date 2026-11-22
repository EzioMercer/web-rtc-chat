import { sendControl } from '../../../core/webrtc/sendControl.ts';
import type { AppThunk } from '../../store.ts';
import { ControlType, CallAction } from '../../../core/webrtc/types.ts';

// Tells the peer whether our microphone and camera are on, and whether we share our screen, so it can show it.
export const sendCallState = (): AppThunk => (_dispatch, getState) => {
  const { mic, cam, ownVideo, screen, key } = getState().call;

  if (key) {
    sendControl(key, { t: ControlType.Call, action: CallAction.State, mic, cam: ownVideo && cam && !screen, screen });
  }
};
