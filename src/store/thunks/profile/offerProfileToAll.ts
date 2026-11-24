import type { AppThunk } from '../../store.ts';
import { offerProfile } from './offerProfile.ts';

// Tells every connected contact about a change to our profile. Contacts who are offline now hear about it when they
// connect next.
export const offerProfileToAll = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  for (const contact of getState().contacts.list) {
    await dispatch(offerProfile(contact.id));
  }
};
