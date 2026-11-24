import { utcDay } from '../../../core/nostr/utcDay.ts';
import { EXPIRE_CHECK_MS } from '../../../core/webrtc/config.ts';
import { onlineChanged } from '../../app/appSlice.ts';
import { messagesExpired } from '../../chat/chatSlice.ts';
import { connectWaiting } from '../chat/connectWaiting.ts';
import type { AppThunk } from '../../store.ts';
import { openInvite } from '../invite/openInvite.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';
import { pendingInvite } from './pendingInvite.ts';

const DAY_CHECK_MS = 10 * 60 * 1000;

// The expiry check and the network watch start once per page, however often we unlock (a restore unlocks again).
let started = false;

// Starts listening for contacts, gives up on our messages that waited too long (and wipes markers no longer needed),
// connects to contacts we have something waiting for (now, and whenever the device is back online), and opens an
// invite the page was opened with.
export const afterUnlock = (): AppThunk => (dispatch) => {
  let day = utcDay();

  if (!started) {
    started = true;
    window.setInterval(() => dispatch(messagesExpired(Date.now())), EXPIRE_CHECK_MS);
    window.addEventListener('offline', () => dispatch(onlineChanged(false)));
    window.addEventListener('online', () => {
      dispatch(onlineChanged(true));
      dispatch(connectWaiting());
    });
  }

  dispatch(onlineChanged(navigator.onLine));
  dispatch(messagesExpired(Date.now()));
  dispatch(connectWaiting());

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
