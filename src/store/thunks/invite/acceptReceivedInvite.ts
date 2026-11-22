import { deriveInviteMailbox } from '../../../core/nostr/deriveInviteMailbox.ts';
import { publishToMailbox } from '../../../core/nostr/publishToMailbox.ts';
import { newSecret } from '../../../core/signaling/newSecret.ts';
import { sealEnvelope } from '../../../core/signaling/sealEnvelope.ts';
import { inviteError, receivedInviteDone } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { selectConversation } from '../chat/selectConversation.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';
import { saveContact } from './saveContact.ts';
import { SignalType } from '../../../core/signaling/types.ts';

// We used someone's invite: save them as a contact and send them, signed, the secret for our mailboxes.
// They connect to us once they accept.
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

  try {
    const mailbox = await deriveInviteMailbox(invite.secret);

    await publishToMailbox(mailbox.pk, await sealEnvelope(invite.identity, { t: SignalType.InviteAccept, secret }));
  } catch (err) {
    dispatch(inviteError(err instanceof Error ? err.message : 'Could not send the request.'));

    return;
  }

  const id = dispatch(saveContact({ name, identity: invite.identity, secret, replaceId }));

  dispatch(receivedInviteDone());
  await dispatch(refreshMailboxes());
  dispatch(selectConversation(id));
};
