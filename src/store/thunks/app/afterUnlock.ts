import { utcDay } from '../../../nostr/utcDay.ts';
import type { AppThunk } from '../../store.ts';
import { openInvite } from '../invite/openInvite.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';
import { pendingInvite } from './pendingInvite.ts';

const DAY_CHECK_MS = 10 * 60 * 1000;

// Starts listening for contacts, and opens an invite the page was opened with.
export const afterUnlock = (): AppThunk => (dispatch) => {
  let day = utcDay();

  void dispatch(refreshMailboxes());

  // Mailbox addresses change every day.
  window.setInterval(() => {
    if (utcDay() !== day) {
      day = utcDay();
      void dispatch(refreshMailboxes());
    }
  }, DAY_CHECK_MS);

  if (pendingInvite.text) {
    dispatch(openInvite(pendingInvite.text));
    pendingInvite.text = '';
  }
};
