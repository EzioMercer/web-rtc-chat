import { vault } from '../../../identity/vault.ts';
import { deriveMailbox } from '../../../nostr/deriveMailbox.ts';
import { listen } from '../../../nostr/listen.ts';
import { utcDay } from '../../../nostr/utcDay.ts';
import { activeInvites } from '../../../signaling/activeInvites.ts';
import { routes, type Route } from '../../../signaling/routes.ts';
import type { AppThunk } from '../../store.ts';
import { handleSignal } from './handleSignal.ts';

let version = 0;

// Listens on every mailbox where someone may reach us: each contact's (yesterday, today and tomorrow, to cover
// clock differences around midnight, for every secret still in use) and our open invite's.
export const refreshMailboxes = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  if (getState().app.phase !== 'ready') {
    return;
  }

  const mine = ++version;
  const keys = new Map<string, Uint8Array>();
  const next = new Map<string, Route>();
  const days = [utcDay(-1), utcDay(), utcDay(1)];

  for (const contact of getState().contacts.list) {
    for (const secret of contact.secrets) {
      for (const day of days) {
        const mailbox = await deriveMailbox(secret, vault.publicKey, day);

        keys.set(mailbox.pk, mailbox.sk);
        next.set(mailbox.pk, { kind: 'contact', id: contact.id });
      }
    }
  }

  activeInvites.forEach(({ sk, expiresAt }, pk) => {
    if (expiresAt > Date.now()) {
      keys.set(pk, sk);
      next.set(pk, { kind: 'invite' });
    }
  });

  // A newer refresh started while this one was deriving keys.
  if (mine !== version) {
    return;
  }

  routes.clear();
  next.forEach((route, pk) => routes.set(pk, route));
  listen(keys, (mailbox, plaintext) => void dispatch(handleSignal(mailbox, plaintext)));
};
