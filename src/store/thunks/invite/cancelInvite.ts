import { activeInvites } from '../../../core/signaling/activeInvites.ts';
import { dropInvite } from '../../../core/signaling/dropInvite.ts';
import { inviteClosed } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';
import { refreshMailboxes } from '../signal/refreshMailboxes.ts';

export const cancelInvite = (): AppThunk => (dispatch) => {
  [...activeInvites.keys()].forEach(dropInvite);
  dispatch(inviteClosed());
  void dispatch(refreshMailboxes());
};
