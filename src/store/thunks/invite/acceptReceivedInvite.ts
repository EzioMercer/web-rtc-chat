import { vault } from '../../../core/identity/vault.ts';
import { deriveInviteMailbox } from '../../../core/nostr/deriveInviteMailbox.ts';
import { deriveRevealMailbox } from '../../../core/nostr/deriveRevealMailbox.ts';
import { publishToMailbox } from '../../../core/nostr/publishToMailbox.ts';
import { REVEAL_TIMEOUT_MS } from '../../../core/signaling/config.ts';
import { inviteSafety } from '../../../core/signaling/inviteSafety.ts';
import { newSecret } from '../../../core/signaling/newSecret.ts';
import { pendingJoins } from '../../../core/signaling/pendingJoins.ts';
import { sealEnvelope } from '../../../core/signaling/sealEnvelope.ts';
import { SignalType } from '../../../core/signaling/types.ts';
import { inviteError, receivedInviteDone } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { selectConversation } from '../chat/selectConversation.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';
import { saveContact } from './saveContact.ts';

// We used someone's invite: send them, signed, our key and the secret for our mailboxes, then wait for them to
// reveal their key (it must match the link) and save them as a contact. They connect to us once they accept.
export const acceptReceivedInvite = (name: string, replaceId: string | null): AppThunk<Promise<void>> => async (
  dispatch,
  getState,
) => {
  const invite = getState().invites.received;

  if (!invite) {
    return;
  }

  if (invite.expiresAt < Date.now()) {
    dispatch(inviteError('This invite has expired. Ask for a new one.'));

    return;
  }

  const secret = newSecret();
  const nonce = newSecret();
  const revealMailbox = await deriveRevealMailbox(invite.secret);
  let timer = 0;
  const revealed = new Promise<{ identity: string; nonce: string } | null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), REVEAL_TIMEOUT_MS);
    pendingJoins.set(revealMailbox.pk, {
      sk: revealMailbox.sk,
      commitment: invite.commitment,
      done: (identity, theirNonce) => resolve({ identity, nonce: theirNonce }),
    });
  });

  const finish = async () => {
    window.clearTimeout(timer);
    pendingJoins.delete(revealMailbox.pk);
    await dispatch(refreshMailboxes());
  };

  try {
    // Listen before sending, so the reveal isn't missed.
    await dispatch(refreshMailboxes());

    const mailbox = await deriveInviteMailbox(invite.secret);

    await publishToMailbox(
      mailbox.pk,
      await sealEnvelope(invite.commitment, { t: SignalType.InviteAccept, secret, nonce }),
    );
  } catch (err) {
    await finish();
    dispatch(inviteError(err instanceof Error ? err.message : 'Could not send the request.'));

    return;
  }

  const reveal = await revealed;

  await finish();

  if (!reveal) {
    dispatch(inviteError(
      'Their app didn\'t answer. Ask them to keep the app open and send you a new invite (each one works once).',
    ));

    return;
  }

  const safety = await inviteSafety(reveal.identity, vault.publicKey, reveal.nonce, nonce);
  const id = dispatch(saveContact({ name, identity: reveal.identity, secret, safety, replaceId }));

  dispatch(receivedInviteDone());
  await dispatch(refreshMailboxes());
  dispatch(selectConversation(id));
};
