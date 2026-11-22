import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CallState } from './types.ts';

const initialState: CallState = {
  key: null,
  status: 'idle',
  video: false,
  ownVideo: false,
  mic: true,
  cam: true,
  remoteMic: true,
  remoteCam: true,
  screen: false,
  remoteScreen: false,
  remoteStreamVersion: 0,
  echoGuard: false,
  echoPrompt: 'none',
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    callStarted: (
      state,
      { payload }: PayloadAction<{ key: string; status: 'outgoing' | 'incoming'; video: boolean; echoGuard: boolean }>,
    ) => ({
      ...initialState,
      remoteStreamVersion: state.remoteStreamVersion,
      key: payload.key,
      status: payload.status,
      video: payload.video,
      ownVideo: payload.video,
      echoGuard: payload.echoGuard,
    }),
    callActive: (state) => {
      state.status = 'active';
    },
    answeredWithAudioOnly: (state) => {
      state.ownVideo = false;
      state.cam = false;
    },
    callEnded: state => ({ ...initialState, remoteStreamVersion: state.remoteStreamVersion }),
    micToggled: (state) => {
      state.mic = !state.mic;
    },
    camToggled: (state) => {
      state.cam = !state.cam;
    },
    remoteMediaChanged: (state, { payload }: PayloadAction<{ mic: boolean; cam: boolean; screen: boolean }>) => {
      state.remoteMic = payload.mic;
      state.remoteCam = payload.cam;
      state.remoteScreen = payload.screen;
    },
    screenChanged: (state, { payload }: PayloadAction<boolean>) => {
      state.screen = payload;
    },
    echoGuardToggled: (state) => {
      state.echoGuard = !state.echoGuard;
    },
    // They hear an echo of themselves: ask once per call, and only while our echo guard is off.
    echoReported: (state) => {
      if (state.status === 'active' && !state.echoGuard && state.echoPrompt === 'none') {
        state.echoPrompt = 'open';
      }
    },
    echoPromptAnswered: (state, { payload }: PayloadAction<boolean>) => {
      state.echoPrompt = 'done';
      state.echoGuard = state.echoGuard || payload;
    },
    remoteStreamChanged: (state) => {
      state.remoteStreamVersion += 1;
    },
  },
});

export const {
  callStarted,
  callActive,
  answeredWithAudioOnly,
  callEnded,
  micToggled,
  camToggled,
  remoteMediaChanged,
  remoteStreamChanged,
  screenChanged,
  echoGuardToggled,
  echoReported,
  echoPromptAnswered,
} = callSlice.actions;

export const callReducer = callSlice.reducer;
