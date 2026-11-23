import { makePicture } from '../../../core/profile/makePicture.ts';
import { pictureChosen } from '../../profile/profileSlice.ts';
import type { AppThunk } from '../../store.ts';
import { offerPicture } from './offerPicture.ts';

// Makes our picture from a chosen image file (or removes it, for null) and tells every connected contact. Contacts
// who are offline now hear about it when they connect next. Throws when the file can't be made into a picture.
export const setPicture = (file: Blob | null): AppThunk<Promise<void>> => async (dispatch, getState) => {
  dispatch(pictureChosen(file ? await makePicture(file) : null));

  for (const contact of getState().contacts.list) {
    await dispatch(offerPicture(contact.id));
  }
};
