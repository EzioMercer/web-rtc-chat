import { requestDone } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { selectConversation } from '../chat/selectConversation.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';
import { saveContact } from './saveContact.ts';

// Someone used our invite and we accepted: save them and connect (opening the chat sends the first offer).
export const acceptRequest = (requestId: string, name: string, replaceId: string | null): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const request = getState().invites.requests.find(r => r.id === requestId);

    if (!request) {
      return;
    }

    const { identity, secret, safety } = request;
    const id = dispatch(saveContact({ name, identity, secret, safety, replaceId }));

    dispatch(requestDone(requestId));
    // Listen on the new mailbox before sending the offer, so the answer isn't missed.
    await dispatch(refreshMailboxes());
    dispatch(selectConversation(id));
  }
;
