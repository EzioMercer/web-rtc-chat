import { LAST_CONNECTED_EVERY_MS } from '../../../core/webrtc/config.ts';
import { contactSeen } from '../../contacts/contactsSlice.ts';
import type { AppThunk } from '../../store.ts';

// We are, or just were, connected to this contact: their "last connected" time becomes now. With `renew`, only when
// it is older than LAST_CONNECTED_EVERY_MS, so an open connection doesn't save the contacts every minute. Not for the
// manual connection, which isn't a contact.
export const noteConnected = (key: string, renew = false): AppThunk => (dispatch, getState) => {
  const contact = getState().contacts.list.find(c => c.id === key);
  const now = Date.now();

  if (!contact || (renew && contact.lastConnected !== null && now - contact.lastConnected < LAST_CONNECTED_EVERY_MS)) {
    return;
  }

  dispatch(contactSeen({ id: key, at: now }));
};
