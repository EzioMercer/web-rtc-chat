import { PROGRESS_MS } from '../../../core/backup/config.ts';
import { backupProgress } from '../../backup/backupSlice.ts';
import type { AppDispatch } from '../../store.ts';

// Reports progress to the screen at most every PROGRESS_MS.
export const progressReporter = (dispatch: AppDispatch) => {
  let last = 0;

  return (done: number) => {
    if (Date.now() - last >= PROGRESS_MS) {
      last = Date.now();
      dispatch(backupProgress(done));
    }
  };
};
