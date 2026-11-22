import { vault } from '../../../core/identity/vault.ts';
import { deriveMailbox } from '../../../core/nostr/deriveMailbox.ts';
import { listen } from '../../../core/nostr/listen.ts';
import { utcDay } from '../../../core/nostr/utcDay.ts';
import { activeInvites } from '../../../core/signaling/activeInvites.ts';
import { RouteKind, routes, type Route } from '../../../core/signaling/routes.ts';
import type { AppThunk } from '../../store.ts';
import { handleSignal } from './handleSignal.ts';
import { AppPhase } from '../../app/types.ts';

let version = 0;

// Listens on every mailbox where someone may reach us: each contact's (yesterday, today and tomorrow, to cover
// clock differences around midnight, for every secret still in use) and our open invite's.
export const refreshMailboxes = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  if (getState().app.phase !== AppPhase.Ready) {
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
        next.set(mailbox.pk, { kind: RouteKind.Contact, id: contact.id });
      }
    }
  }

  activeInvites.forEach(({ sk, expiresAt }, pk) => {
    if (expiresAt > Date.now()) {
      keys.set(pk, sk);
      next.set(pk, { kind: RouteKind.Invite });
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
