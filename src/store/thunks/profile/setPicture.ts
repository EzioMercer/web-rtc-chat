import { makePicture } from '../../../core/profile/makePicture.ts';
import { pictureChosen } from '../../profile/profileSlice.ts';
import type { AppThunk } from '../../store.ts';
import { offerProfileToAll } from './offerProfileToAll.ts';

// Makes our picture from a chosen image file (or removes it, for null) and tells every connected contact. Throws
// when the file can't be made into a picture.
export const setPicture = (file: Blob | null): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(pictureChosen(file ? await makePicture(file) : null));
  await dispatch(offerProfileToAll());
};
