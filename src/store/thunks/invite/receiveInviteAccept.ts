import { contactKeys } from '../../../core/identity/contactKeys.ts';
import { publishToMailbox } from '../../../core/nostr/publishToMailbox.ts';
import { activeInvites } from '../../../core/signaling/activeInvites.ts';
import { inviteSafety } from '../../../core/signaling/inviteSafety.ts';
import { isSecret } from '../../../core/signaling/isSecret.ts';
import { openEnvelope } from '../../../core/signaling/openEnvelope.ts';
import { sealEnvelope } from '../../../core/signaling/sealEnvelope.ts';
import { SignalType } from '../../../core/signaling/types.ts';
import { inviteClosed, requestReceived } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';

// Someone used our invite (`mailbox`). They sent their key first, so now we reveal ours, and ask the user to accept.
export const receiveInviteAccept = (mailbox: string, plaintext: string): AppThunk<Promise<void>> => async (
  dispatch,
) => {
  const invite = activeInvites.get(mailbox);
  const key = invite && contactKeys.get(invite.id);

  if (!invite || !key || invite.expiresAt < Date.now()) {
    return;
  }

  // Anyone may use an invite, so the reply is only checked to be signed by the key it claims.
  const body = await openEnvelope(plaintext, null, invite.commitment);
  const accept = body?.msg.t === SignalType.InviteAccept ? body.msg : null;

  if (!body || !accept || !isSecret(accept.secret)) {
    return;
  }

  // Single use: whoever answers first gets the reveal, so nobody can try again with another key. The key made for
  // the invite now waits for the user to accept or reject them, under the request's id.
  activeInvites.delete(mailbox);
  dispatch(inviteClosed());

  const safety = await inviteSafety(key.publicKey, body.from);

  dispatch(requestReceived({ id: invite.id, identity: body.from, secret: accept.secret, safety }));

  // If no relay is reachable, their app gives up after a while and tells them to ask for a new invite.
  await publishToMailbox(
    invite.revealMailbox,
    await sealEnvelope(key, body.from, { t: SignalType.InviteReveal }),
  ).catch(() => undefined);

  await dispatch(refreshMailboxes());
};
