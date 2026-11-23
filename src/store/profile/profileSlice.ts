import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProfileState } from './types.ts';

export const EMPTY_PROFILE: ProfileState = {
  picture: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState: EMPTY_PROFILE,
  reducers: {
    profileLoaded: (_state, { payload }: PayloadAction<ProfileState>) => payload,
    pictureChosen: (state, { payload }: PayloadAction<string | null>) => {
      state.picture = payload;
    },
  },
});

export const { profileLoaded, pictureChosen } = profileSlice.actions;

export const profileReducer = profileSlice.reducer;
