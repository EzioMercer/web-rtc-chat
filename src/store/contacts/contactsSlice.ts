import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProfileInfo } from '../../core/profile/types.ts';
import type { Contact, ContactsState } from './types.ts';

const initialState: ContactsState = {
  list: [],
};

// How many mailbox secrets we keep listening on while a rotation is in progress.
const MAX_SECRETS = 3;

const find = (state: ContactsState, id: string) => state.list.find(contact => contact.id === id);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    contactsLoaded: (state, { payload }: PayloadAction<Contact[]>) => {
      state.list = payload;
    },
    contactAdded: (state, { payload }: PayloadAction<Contact>) => {
      state.list.push(payload);
    },
    contactReplaced: (state, { payload }: PayloadAction<{ id: string; contact: Contact }>) => {
      const index = state.list.findIndex(contact => contact.id === payload.id);

      if (index >= 0) {
        state.list[index] = payload.contact;
      }
    },
    contactRenamed: (state, { payload }: PayloadAction<{ id: string; name: string }>) => {
      const contact = find(state, payload.id);

      if (contact) {
        contact.name = payload.name;
      }
    },
    contactDeleted: (state, { payload }: PayloadAction<string>) => {
      state.list = state.list.filter(contact => contact.id !== payload);
    },
    favouriteToggled: (state, { payload }: PayloadAction<string>) => {
      const contact = find(state, payload);

      if (contact) {
        contact.favourite = !contact.favourite;
      }
    },
    verifiedSet: (state, { payload }: PayloadAction<{ id: string; verified: boolean }>) => {
      const contact = find(state, payload.id);

      if (contact) {
        contact.verified = payload.verified;
      }
    },
    // They sent their picture, or told us they have none.
    pictureReceived: (state, { payload }: PayloadAction<{ id: string; picture: string | null }>) => {
      const contact = find(state, payload.id);

      if (contact) {
        if (payload.picture) {
          contact.picture = payload.picture;
        } else {
          delete contact.picture;
        }
      }
    },
    // They sent their phone number, description and birthday; empty ones are removed.
    infoReceived: (state, { payload }: PayloadAction<{ id: string; info: ProfileInfo }>) => {
      const contact = find(state, payload.id);

      if (contact) {
        for (const field of ['phone', 'about', 'birthday'] as const) {
          if (payload.info[field]) {
            contact[field] = payload.info[field];
          } else {
            delete contact[field];
          }
        }
      }
    },
    // We are connected to them, or just were, at `at`.
    contactSeen: (state, { payload }: PayloadAction<{ id: string; at: number }>) => {
      const contact = find(state, payload.id);

      if (contact) {
        contact.lastConnected = payload.at;
      }
    },
    // Moves `id` to where `beforeId` is (or to the end of its group when null).
    contactMoved: (state, { payload }: PayloadAction<{ id: string; beforeId: string | null }>) => {
      const from = state.list.findIndex(contact => contact.id === payload.id);

      if (from < 0 || payload.id === payload.beforeId) {
        return;
      }

      const [moved] = state.list.splice(from, 1);
      const to = payload.beforeId ? state.list.findIndex(contact => contact.id === payload.beforeId) : -1;

      if (to < 0) {
        state.list.push(moved);
      } else {
        state.list.splice(to, 0, moved);
      }
    },
    // Rotation, proposer side: start listening on the new secret, keep sending on the old one until confirmed.
    secretProposed: (state, { payload }: PayloadAction<{ id: string; secret: string }>) => {
      const contact = find(state, payload.id);

      if (contact) {
        contact.secrets = [payload.secret, ...contact.secrets.filter(s => s !== payload.secret)].slice(0, MAX_SECRETS);
      }
    },
    // Rotation, other side: use the new secret right away, but keep listening on the old ones for now.
    secretAdopted: (state, { payload }: PayloadAction<{ id: string; secret: string }>) => {
      const contact = find(state, payload.id);

      if (contact) {
        contact.secrets = [payload.secret, ...contact.secrets.filter(s => s !== payload.secret)].slice(0, MAX_SECRETS);
        contact.sendSecret = payload.secret;
      }
    },
    // Both sides confirmed the new secret: retire the old ones.
    secretConfirmed: (state, { payload }: PayloadAction<{ id: string; secret: string }>) => {
      const contact = find(state, payload.id);

      if (contact?.secrets.includes(payload.secret)) {
        contact.secrets = [payload.secret];
        contact.sendSecret = payload.secret;
      }
    },
  },
});

export const {
  contactsLoaded,
  contactAdded,
  contactReplaced,
  contactRenamed,
  contactDeleted,
  favouriteToggled,
  verifiedSet,
  pictureReceived,
  infoReceived,
  contactMoved,
  contactSeen,
  secretProposed,
  secretAdopted,
  secretConfirmed,
} = contactsSlice.actions;

export const contactsReducer = contactsSlice.reducer;
