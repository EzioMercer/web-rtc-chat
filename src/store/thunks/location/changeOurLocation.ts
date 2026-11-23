import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { locationChanged } from '../../chat/chatSlice.ts';
import type { GeoPoint } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { findOurLocation } from './findOurLocation.ts';
import { locationSignal } from './locationSignal.ts';

// Changes one of our live locations (it moved, it stopped, or just "still here") and sends its new state. It stays
// "pending" until they confirm this change; without a connection it goes out when one opens (see sendPending).
export const changeOurLocation = (
  key: string,
  id: string,
  change: Partial<GeoPoint> & { liveUntil?: number },
): AppThunk => (dispatch) => {
  const before = dispatch(findOurLocation(key, id));

  if (!before) {
    return;
  }

  const rev = (before.rev ?? 0) + 1;

  dispatch(locationChanged({ key, id, change: { ...change, rev, updatedAt: Date.now(), pending: true } }));

  const after = dispatch(findOurLocation(key, id));

  if (after) {
    sendControl(key, locationSignal(after));
  }
};
