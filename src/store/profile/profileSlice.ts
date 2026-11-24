import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProfileInfo } from '../../core/profile/types.ts';
import type { ProfileState } from './types.ts';

export const EMPTY_PROFILE: ProfileState = {
  picture: null,
  phone: '',
  about: '',
};

const profileSlice = createSlice({
  name: 'profile',
  initialState: EMPTY_PROFILE,
  reducers: {
    profileLoaded: (_state, { payload }: PayloadAction<ProfileState>) => payload,
    pictureChosen: (state, { payload }: PayloadAction<string | null>) => {
      state.picture = payload;
    },
    infoChosen: (state, { payload }: PayloadAction<ProfileInfo>) => {
      state.phone = payload.phone;
      state.about = payload.about;
    },
  },
});

export const { profileLoaded, pictureChosen, infoChosen } = profileSlice.actions;

export const profileReducer = profileSlice.reducer;
