import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { EchoGuardSetting, SettingsState } from './types.ts';

export const DEFAULT_SETTINGS: SettingsState = {
  echoGuard: 'auto',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: DEFAULT_SETTINGS,
  reducers: {
    settingsLoaded: (_state, { payload }: PayloadAction<SettingsState>) => payload,
    echoGuardChosen: (state, { payload }: PayloadAction<EchoGuardSetting>) => {
      state.echoGuard = payload;
    },
  },
});

export const { settingsLoaded, echoGuardChosen } = settingsSlice.actions;

export const settingsReducer = settingsSlice.reducer;
