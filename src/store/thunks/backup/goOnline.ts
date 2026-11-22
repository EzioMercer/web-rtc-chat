import { pausedChanged } from '../../app/appSlice.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';

// Back online after a backup: listens on relays again and reconnects the open chat. Messages written to or by us
// meanwhile go out as connections come back (see sendPending).
export const goOnline = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  dispatch(pausedChanged(false));
  await dispatch(refreshMailboxes());

  const selected = getState().ui.selected;

  if (selected && getState().contacts.list.some(contact => contact.id === selected)) {
    void dispatch(connectContact(selected));
  }
};
