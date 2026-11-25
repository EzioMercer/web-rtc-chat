import { contactKeys } from '../../../core/identity/contactKeys.ts';
import { closeSession } from '../../../core/webrtc/closeSession.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { addMessage } from '../../chat/chatSlice.ts';
import { contactAdded, contactReplaced } from '../../contacts/contactsSlice.ts';
import type { Contact } from '../../contacts/types.ts';
import { sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { SessionStatus } from '../../sessions/types.ts';
import { MessageAuthor } from '../../chat/types.ts';

type NewContact = {
  // Where our new key for them is (contactKeys), and their id if they are new.
  id: string;
  name: string;
  identity: string;
  secret: string;
  safety: string;
  // Id of an existing contact this one replaces (e.g. they lost their device), or null for a new one.
  replaceId: string | null;
};

// Adds a contact, or replaces one. Returns its id.
export const saveContact = ({ id, name, identity, secret, safety, replaceId }: NewContact): AppThunk<string> => (
  dispatch,
  getState,
) => {
  const key = contactKeys.get(id);

  if (!key) {
    throw new Error('Our key for this contact is missing.');
  }

  const old = getState().contacts.list.find(c => c.id === replaceId);
  const contact: Contact = {
    id: old?.id ?? id,
    name: name.trim() || old?.name || 'New contact',
    favourite: old?.favourite ?? false,
    verified: false,
    identity,
    myKey: key.publicKey,
    safety,
    secrets: [secret],
    sendSecret: secret,
    lastConnected: old?.lastConnected ?? null,
  };

  // Saved with the contact list (see persistence), so it must be in place first.
  contactKeys.delete(id);
  contactKeys.set(contact.id, key);

  if (!old) {
    dispatch(contactAdded(contact));

    return contact.id;
  }

  const session = sessions.get(old.id);

  // The connection belonged to the old keys.
  if (session) {
    closeSession(session);
    dispatch(sessionStatusChanged({ key: old.id, status: SessionStatus.Idle }));
  }

  dispatch(contactReplaced({ id: old.id, contact }));
  dispatch(addMessage({
    key: old.id,
    from: MessageAuthor.System,
    text: old.verified
      ? `⚠ ${contact.name}'s keys changed. Compare the safety code again before trusting this chat.`
      : `${contact.name}'s keys changed. Compare the safety code.`,
  }));

  return contact.id;
};
