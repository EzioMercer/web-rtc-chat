import { readMeta } from '../../../identity/readMeta.ts';
import { lockedFound, setupNeeded } from '../../app/appSlice.ts';
import type { AppThunk } from '../../store.ts';
import { takeInviteFromUrl } from './takeInviteFromUrl.ts';
import { unlockApp } from './unlockApp.ts';

// On page load: first launch, locked identity, or (no protection) unlocked right away.
export const initApp = (): AppThunk<Promise<void>> => async (dispatch) => {
  takeInviteFromUrl();

  const meta = await readMeta();

  if (!meta) {
    dispatch(setupNeeded());
  } else if (meta.mode === 'device') {
    await dispatch(unlockApp());
  } else {
    dispatch(lockedFound(meta.mode));
  }
};
