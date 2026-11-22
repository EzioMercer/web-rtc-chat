import { vault } from '../../../core/identity/vault.ts';
import { deriveInviteMailbox } from '../../../core/nostr/deriveInviteMailbox.ts';
import { deriveRevealMailbox } from '../../../core/nostr/deriveRevealMailbox.ts';
import { activeInvites } from '../../../core/signaling/activeInvites.ts';
import { buildInviteLink } from '../../../core/signaling/buildInviteLink.ts';
import { inviteCommitment } from '../../../core/signaling/inviteCommitment.ts';
import { INVITE_TTL_MS } from '../../../core/signaling/config.ts';
import { newSecret } from '../../../core/signaling/newSecret.ts';
import { inviteClosed, inviteCreated } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';

// Makes a new single-use invite (replacing any previous one) and starts listening for its reply.
export const createInvite = (): AppThunk<Promise<void>> => async (dispatch) => {
  const secret = newSecret();
  const nonce = newSecret();
  const commitment = await inviteCommitment(vault.publicKey, nonce);
  const expiresAt = Date.now() + INVITE_TTL_MS;
  const mailbox = await deriveInviteMailbox(secret);
  const revealMailbox = (await deriveRevealMailbox(secret)).pk;
  const link = buildInviteLink({ v: 2, c: commitment, s: secret, e: Math.floor(expiresAt / 1000) });

  activeInvites.clear();
  activeInvites.set(mailbox.pk, { sk: mailbox.sk, expiresAt, commitment, nonce, revealMailbox });
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
