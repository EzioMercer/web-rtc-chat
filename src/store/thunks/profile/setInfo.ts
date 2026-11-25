import type { ProfileInfo } from '../../../core/profile/types.ts';
import { infoChosen } from '../../profile/profileSlice.ts';
import type { AppThunk } from '../../store.ts';
import { offerProfileToAll } from './offerProfileToAll.ts';

// Saves our phone number, description and birthday (already checked) and tells every connected contact.
export const setInfo = (info: ProfileInfo): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(infoChosen(info));
  await dispatch(offerProfileToAll());
};
