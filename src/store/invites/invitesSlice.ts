import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ContactRequest, InvitesState, ReceivedInvite } from './types.ts';

const initialState: InvitesState = {
  mine: null,
  received: null,
  requests: [],
  error: null,
};

const invitesSlice = createSlice({
  name: 'invites',
  initialState,
  reducers: {
    inviteCreated: (state, { payload }: PayloadAction<{ link: string; expiresAt: number }>) => {
      state.mine = payload;
    },
    inviteClosed: (state) => {
      state.mine = null;
    },
    inviteReceived: (state, { payload }: PayloadAction<ReceivedInvite>) => {
      state.received = payload;
      state.error = null;
    },
    receivedInviteDone: (state) => {
      state.received = null;
    },
    requestReceived: (state, { payload }: PayloadAction<ContactRequest>) => {
      state.requests.push(payload);
    },
    requestDone: (state, { payload }: PayloadAction<string>) => {
      state.requests = state.requests.filter(request => request.id !== payload);
    },
    inviteError: (state, { payload }: PayloadAction<string | null>) => {
      state.error = payload;
    },
  },
});

export const {
  inviteCreated,
  inviteClosed,
  inviteReceived,
  receivedInviteDone,
  requestReceived,
  requestDone,
  inviteError,
} = invitesSlice.actions;

export const invitesReducer = invitesSlice.reducer;
