import type { ProtectionMode } from '../../../core/identity/types.ts';
import { unlocked } from '../../app/appSlice.ts';
import type { AppThunk } from '../../store.ts';
import { afterUnlock } from '../app/afterUnlock.ts';

// Opens the app with an identity just restored on the setup screen (see importBackup).
export const openRestored = (mode: ProtectionMode): AppThunk => (dispatch) => {
  dispatch(unlocked(mode));
  dispatch(afterUnlock());
};
