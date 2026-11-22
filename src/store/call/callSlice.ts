import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type CallState, CallStatus, EchoPromptState } from './types.ts';

const initialState: CallState = {
  key: null,
  status: CallStatus.Idle,
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
  echoPrompt: EchoPromptState.None,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    callStarted: (
      state,
      { payload }: PayloadAction<{
        key: string;
        status: CallStatus.Outgoing | CallStatus.Incoming;
        video: boolean;
        echoGuard: boolean;
      }>,
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
      state.status = CallStatus.Active;
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
      if (state.status === CallStatus.Active && !state.echoGuard && state.echoPrompt === EchoPromptState.None) {
        state.echoPrompt = EchoPromptState.Open;
      }
    },
    echoPromptAnswered: (state, { payload }: PayloadAction<boolean>) => {
      state.echoPrompt = EchoPromptState.Done;
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
