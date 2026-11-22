import { openEnvelope } from '../../../core/signaling/openEnvelope.ts';
import { RouteKind, routes } from '../../../core/signaling/routes.ts';
import type { AppThunk } from '../../store.ts';
import { receiveCandidates } from '../contact/receiveCandidates.ts';
import { receiveAnswer } from '../contact/receiveAnswer.ts';
import { receiveOffer } from '../contact/receiveOffer.ts';
import { receivePath } from '../contact/receivePath.ts';
import { receiveInviteAccept } from '../invite/receiveInviteAccept.ts';
import { receiveInviteReveal } from '../invite/receiveInviteReveal.ts';
import { SignalType } from '../../../core/signaling/types.ts';

// A decrypted event arrived in one of our mailboxes. Anything not signed by the right identity is dropped.
export const handleSignal = (mailbox: string, plaintext: string): AppThunk<Promise<void>> => async (
  dispatch,
  getState,
) => {
  const route = routes.get(mailbox);

  if (route?.kind === RouteKind.Invite) {
    await dispatch(receiveInviteAccept(mailbox, plaintext));

    return;
  }

  if (route?.kind === RouteKind.Reveal) {
    await receiveInviteReveal(mailbox, plaintext);

    return;
  }

  if (route?.kind !== RouteKind.Contact) {
    return;
  }

  const contact = getState().contacts.list.find(c => c.id === route.id);
  const body = contact ? await openEnvelope(plaintext, contact.identity) : null;

  if (!contact || !body) {
    return;
  }

  if (body.msg.t === SignalType.Offer) {
    await dispatch(receiveOffer(contact.id, body.msg));
  } else if (body.msg.t === SignalType.Answer) {
    await dispatch(receiveAnswer(contact.id, body.msg));
  } else if (body.msg.t === SignalType.Ice) {
    await dispatch(receiveCandidates(contact.id, body.msg));
  } else if (body.msg.t === SignalType.Path) {
    await dispatch(receivePath(contact.id, body.msg));
  }
};
