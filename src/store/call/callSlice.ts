import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CallState } from './types.ts';

const initialState: CallState = {
  status: 'idle',
  video: false,
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
    callStarted: (state, { payload }: PayloadAction<{ status: 'outgoing' | 'incoming'; video: boolean }>) => ({
      ...initialState,
      remoteStreamVersion: state.remoteStreamVersion,
      status: payload.status,
      video: payload.video,
    }),
    callActive: (state) => {
      state.status = 'active';
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
  callEnded,
  micToggled,
  camToggled,
  remoteMediaChanged,
  remoteStreamChanged,
} = callSlice.actions;

export const callReducer = callSlice.reducer;
