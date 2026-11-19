import { changeProtection } from '../../../identity/changeProtection.ts';
import type { ProtectionChoice } from '../../../identity/types.ts';
import { busyStarted, failed, unlocked } from '../../app/appSlice.ts';
import type { AppThunk } from '../../store.ts';
import { errorMessage } from './errorMessage.ts';

// Switches how the identity is protected. Returns whether it worked.
export const updateProtection = (choice: ProtectionChoice): AppThunk<Promise<boolean>> => async (
  dispatch,
  getState,
) => {
  dispatch(busyStarted());

  try {
    await changeProtection(choice, getState().contacts.list);
  } catch (err) {
    dispatch(failed(errorMessage(err)));

    return false;
  }

  dispatch(unlocked(choice.mode));

  return true;
};
