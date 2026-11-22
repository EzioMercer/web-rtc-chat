import { nanoid } from '@reduxjs/toolkit';
import { contactKeys } from '../../../core/identity/contactKeys.ts';
import { newContactKey } from '../../../core/identity/newContactKey.ts';
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

// We used someone's invite: send them, signed with a new key just for them, that key and the secret for our
// mailboxes, then wait for them to reveal their key (it must match the link) and save them as a contact. They
// connect to us once they accept.
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

  const id = nanoid();
  const key = await newContactKey();
  const secret = newSecret();
  const revealMailbox = await deriveRevealMailbox(invite.secret);
  let timer = 0;
  const revealed = new Promise<string | null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), REVEAL_TIMEOUT_MS);
    pendingJoins.set(revealMailbox.pk, {
      sk: revealMailbox.sk,
      commitment: invite.commitment,
      myKey: key.publicKey,
      done: resolve,
    });
  });

  const finish = async () => {
    window.clearTimeout(timer);
    pendingJoins.delete(revealMailbox.pk);
    await dispatch(refreshMailboxes());
  };

  contactKeys.set(id, key);

  try {
    // Listen before sending, so the reveal isn't missed.
    await dispatch(refreshMailboxes());

    const mailbox = await deriveInviteMailbox(invite.secret);

    await publishToMailbox(
      mailbox.pk,
      await sealEnvelope(key, invite.commitment, { t: SignalType.InviteAccept, secret }),
    );
  } catch (err) {
    contactKeys.delete(id);
    await finish();
    dispatch(inviteError(err instanceof Error ? err.message : 'Could not send the request.'));

    return;
  }

  const identity = await revealed;

  await finish();

  if (!identity) {
    contactKeys.delete(id);
    dispatch(inviteError(
      'Their app didn\'t answer. Ask them to keep the app open and send you a new invite (each one works once).',
    ));

    return;
  }

  const safety = await inviteSafety(identity, key.publicKey);
  const contactId = dispatch(saveContact({ id, name, identity, secret, safety, replaceId }));

  dispatch(receivedInviteDone());
  await dispatch(refreshMailboxes());
  dispatch(selectConversation(contactId));
};
