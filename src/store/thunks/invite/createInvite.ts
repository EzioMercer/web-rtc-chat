import { vault } from '../../../identity/vault.ts';
import { deriveInviteMailbox } from '../../../nostr/deriveInviteMailbox.ts';
import { activeInvites } from '../../../signaling/activeInvites.ts';
import { buildInviteLink } from '../../../signaling/buildInviteLink.ts';
import { INVITE_TTL_MS } from '../../../signaling/config.ts';
import { newSecret } from '../../../signaling/newSecret.ts';
import { inviteClosed, inviteCreated } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';

// Makes a new single-use invite (replacing any previous one) and starts listening for its reply.
export const createInvite = (): AppThunk<Promise<void>> => async (dispatch) => {
  const secret = newSecret();
  const expiresAt = Date.now() + INVITE_TTL_MS;
  const mailbox = await deriveInviteMailbox(secret);
  const link = buildInviteLink({ v: 1, k: vault.publicKey, s: secret, e: Math.floor(expiresAt / 1000) });

  activeInvites.clear();
  activeInvites.set(mailbox.pk, { sk: mailbox.sk, expiresAt });
  dispatch(inviteCreated({ link, expiresAt }));
  await dispatch(refreshMailboxes());

  window.setTimeout(() => {
    if (activeInvites.has(mailbox.pk)) {
      activeInvites.delete(mailbox.pk);
      dispatch(inviteClosed());
      void dispatch(refreshMailboxes());
    }
  }, INVITE_TTL_MS);
};
