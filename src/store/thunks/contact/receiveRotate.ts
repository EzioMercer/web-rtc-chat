import { isSecret } from '../../../core/signaling/isSecret.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { type RotateSignal, ControlType } from '../../../core/webrtc/types.ts';
import { secretAdopted, secretConfirmed } from '../../contacts/contactsSlice.ts';
import type { AppThunk } from '../../store.ts';

// The two-step mailbox secret swap: rotate -> rotate-ack -> rotate-done.
export const receiveRotate = (id: string, signal: RotateSignal): AppThunk => (dispatch, getState) => {
  if (!getState().contacts.list.some(c => c.id === id) || !isSecret(signal.secret)) {
    return;
  }

  switch (signal.t) {
    case ControlType.Rotate:
      dispatch(secretAdopted({ id, secret: signal.secret }));
      sendControl(id, { t: ControlType.RotateAck, secret: signal.secret });
      break;
    case ControlType.RotateAck:
      dispatch(secretConfirmed({ id, secret: signal.secret }));
      sendControl(id, { t: ControlType.RotateDone, secret: signal.secret });
      break;
    case ControlType.RotateDone:
      dispatch(secretConfirmed({ id, secret: signal.secret }));
      break;
  }
};
