import { createIdentity } from '../../../core/identity/createIdentity.ts';
import type { ProtectionChoice } from '../../../core/identity/types.ts';
import { busyStarted, failed, unlocked } from '../../app/appSlice.ts';
import { contactsLoaded } from '../../contacts/contactsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { afterUnlock } from './afterUnlock.ts';
import { errorMessage } from './errorMessage.ts';

export const setupIdentity = (choice: ProtectionChoice): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(busyStarted());

  try {
    await createIdentity(choice);
  } catch (err) {
    dispatch(failed(errorMessage(err)));

    return;
  }

  dispatch(contactsLoaded([]));
  dispatch(unlocked(choice.mode));
  dispatch(afterUnlock());
};
