import { isSecret } from '../../../core/signaling/isSecret.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import type { RotateSignal } from '../../../core/webrtc/types.ts';
import { secretAdopted, secretConfirmed } from '../../contacts/contactsSlice.ts';
import type { AppThunk } from '../../store.ts';

// The two-step mailbox secret swap: rotate -> rotate-ack -> rotate-done.
export const receiveRotate = (id: string, signal: RotateSignal): AppThunk => (dispatch, getState) => {
  if (!getState().contacts.list.some(c => c.id === id) || !isSecret(signal.secret)) {
    return;
  }

  switch (signal.t) {
    case 'rotate':
      dispatch(secretAdopted({ id, secret: signal.secret }));
      sendControl(id, { t: 'rotate-ack', secret: signal.secret });
      break;
    case 'rotate-ack':
      dispatch(secretConfirmed({ id, secret: signal.secret }));
      sendControl(id, { t: 'rotate-done', secret: signal.secret });
      break;
    case 'rotate-done':
      dispatch(secretConfirmed({ id, secret: signal.secret }));
      break;
  }
};
