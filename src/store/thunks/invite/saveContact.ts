import { nanoid } from '@reduxjs/toolkit';
import { closeSession } from '../../../webrtc/closeSession.ts';
import { sessions } from '../../../webrtc/state.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import { contactAdded, contactReplaced } from '../../contacts/contactsSlice.ts';
import type { Contact } from '../../contacts/types.ts';
import { sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';

type NewContact = {
  name: string;
  identity: string;
  secret: string;
  // Id of an existing contact this one replaces (e.g. they lost their device), or null for a new one.
  replaceId: string | null;
};

// Adds a contact, or updates one. Returns its id.
export const saveContact = ({ name, identity, secret, replaceId }: NewContact): AppThunk<string> => (
  dispatch,
  getState,
) => {
  const { list } = getState().contacts;
  // Adding the same person again only refreshes the shared secret.
  const old = list.find(c => c.identity === identity) ?? list.find(c => c.id === replaceId);
  const contact: Contact = {
    id: old?.id ?? nanoid(),
    name: name.trim() || old?.name || 'New contact',
    favourite: old?.favourite ?? false,
    verified: old?.identity === identity ? old.verified : false,
    identity,
    secrets: [secret],
    sendSecret: secret,
  };

  if (!old) {
    dispatch(contactAdded(contact));

    return contact.id;
  }

  dispatch(contactReplaced({ id: old.id, contact }));

  if (old.identity !== identity) {
    const session = sessions.get(old.id);

    // The connection belonged to the old key.
    if (session) {
      closeSession(session);
      dispatch(sessionStatusChanged({ key: old.id, status: 'idle' }));
    }

    dispatch(addMessage({
      key: old.id,
      from: 'system',
      text: old.verified
        ? `⚠ ${contact.name}'s identity key changed. Compare the safety code again before trusting this chat.`
        : `${contact.name}'s identity key changed. Compare the safety code.`,
    }));
  }

  return contact.id;
};
