import { nanoid } from '@reduxjs/toolkit';
import { contactKeys } from '../../../core/identity/contactKeys.ts';
import { newContactKey } from '../../../core/identity/newContactKey.ts';
import { deriveInviteMailbox } from '../../../core/nostr/deriveInviteMailbox.ts';
import { deriveRevealMailbox } from '../../../core/nostr/deriveRevealMailbox.ts';
import { activeInvites } from '../../../core/signaling/activeInvites.ts';
import { buildInviteLink } from '../../../core/signaling/buildInviteLink.ts';
import { dropInvite } from '../../../core/signaling/dropInvite.ts';
import { inviteCommitment } from '../../../core/signaling/inviteCommitment.ts';
import { INVITE_TTL_MS } from '../../../core/signaling/config.ts';
import { newSecret } from '../../../core/signaling/newSecret.ts';
import { inviteClosed, inviteCreated } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';

// Makes a new single-use invite (replacing any previous one), with a new key for whoever uses it, and starts
// listening for its reply.
export const createInvite = (): AppThunk<Promise<void>> => async (dispatch) => {
  const id = nanoid();
  const key = await newContactKey();
  const secret = newSecret();
  const commitment = await inviteCommitment(key.publicKey);
  const expiresAt = Date.now() + INVITE_TTL_MS;
  const mailbox = await deriveInviteMailbox(secret);
  const revealMailbox = (await deriveRevealMailbox(secret)).pk;
  const link = buildInviteLink({ v: 3, c: commitment, s: secret, e: Math.floor(expiresAt / 1000) });

  [...activeInvites.keys()].forEach(dropInvite);
  contactKeys.set(id, key);
  activeInvites.set(mailbox.pk, { sk: mailbox.sk, expiresAt, id, commitment, revealMailbox });
  dispatch(inviteCreated({ link, expiresAt }));
  await dispatch(refreshMailboxes());

  window.setTimeout(() => {
    if (activeInvites.has(mailbox.pk)) {
      dropInvite(mailbox.pk);
      dispatch(inviteClosed());
      void dispatch(refreshMailboxes());
    }
  }, INVITE_TTL_MS);
};
