import { importBackup } from '../../../identity/importBackup.ts';
import { readMeta } from '../../../identity/readMeta.ts';
import { busyStarted, failed, lockedFound } from '../../app/appSlice.ts';
import type { AppThunk } from '../../store.ts';
import { errorMessage } from './errorMessage.ts';

// Saves a backup file; it is then unlocked like any saved identity.
export const restoreBackup = (text: string): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(busyStarted());

  try {
    await importBackup(text);

    const meta = await readMeta();

    if (meta && meta.mode !== 'device') {
      dispatch(lockedFound(meta.mode));
    }
  } catch (err) {
    dispatch(failed(errorMessage(err)));
  }
};
