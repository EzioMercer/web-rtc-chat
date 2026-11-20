import { nanoid } from '@reduxjs/toolkit';
import { activeInvites } from '../../../signaling/activeInvites.ts';
import { isSecret } from '../../../signaling/isSecret.ts';
import { openEnvelope } from '../../../signaling/openEnvelope.ts';
import { routes } from '../../../signaling/routes.ts';
import { inviteClosed, requestReceived } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { receiveCandidates } from '../contact/receiveCandidates.ts';
import { receiveAnswer } from '../contact/receiveAnswer.ts';
import { receiveOffer } from '../contact/receiveOffer.ts';
import { receivePath } from '../contact/receivePath.ts';
import { refreshMailboxes } from './refreshMailboxes.ts';

// A decrypted event arrived in one of our mailboxes. Anything not signed by the right identity is dropped.
export const handleSignal = (mailbox: string, plaintext: string): AppThunk<Promise<void>> => async (
  dispatch,
  getState,
) => {
  const route = routes.get(mailbox);

  if (route?.kind === 'invite') {
    const invite = activeInvites.get(mailbox);
    // Anyone may use an invite, so the reply is only checked to be signed by the key it claims.
    const body = await openEnvelope(plaintext, null);

    if (!invite || invite.expiresAt < Date.now() || body?.msg.t !== 'invite-accept' || !isSecret(body.msg.secret)) {
      return;
    }

    // Single use.
    activeInvites.delete(mailbox);
    dispatch(inviteClosed());
    dispatch(requestReceived({ id: nanoid(), identity: body.from, secret: body.msg.secret }));
    await dispatch(refreshMailboxes());

    return;
  }

  if (route?.kind !== 'contact') {
    return;
  }

  const contact = getState().contacts.list.find(c => c.id === route.id);
  const body = contact ? await openEnvelope(plaintext, contact.identity) : null;

  if (!contact || !body) {
    return;
  }

  if (body.msg.t === 'offer') {
    await dispatch(receiveOffer(contact.id, body.msg));
  } else if (body.msg.t === 'answer') {
    await dispatch(receiveAnswer(contact.id, body.msg));
  } else if (body.msg.t === 'ice') {
    await dispatch(receiveCandidates(contact.id, body.msg));
  } else if (body.msg.t === 'path') {
    await dispatch(receivePath(contact.id, body.msg));
  }
};
