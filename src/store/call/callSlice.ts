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
  remoteStreamVersion: 0,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    callStarted: (
      state,
      { payload }: PayloadAction<{ key: string; status: 'outgoing' | 'incoming'; video: boolean }>,
    ) => ({
      ...initialState,
      remoteStreamVersion: state.remoteStreamVersion,
      key: payload.key,
      status: payload.status,
      video: payload.video,
      ownVideo: payload.video,
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
    remoteMediaChanged: (state, { payload }: PayloadAction<{ mic: boolean; cam: boolean }>) => {
      state.remoteMic = payload.mic;
      state.remoteCam = payload.cam;
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
} = callSlice.actions;

export const callReducer = callSlice.reducer;
