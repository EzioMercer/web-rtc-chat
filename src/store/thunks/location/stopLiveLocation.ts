import type { AppThunk } from '../../store.ts';
import { changeOurLocation } from './changeOurLocation.ts';
import { findOurLocation } from './findOurLocation.ts';
import { stopLiveWatch } from './stopLiveWatch.ts';

// We stop sharing live location `id` before its time is up; they are told, and it stays where it was last.
export const stopLiveLocation = (key: string, id: string): AppThunk => (dispatch) => {
  const message = dispatch(findOurLocation(key, id));

  stopLiveWatch(id);

  if (message?.liveUntil !== undefined && message.liveUntil > Date.now()) {
    dispatch(changeOurLocation(key, id, { liveUntil: Date.now() }));
  }
};
