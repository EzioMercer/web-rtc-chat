import { contactKeys } from '../../../core/identity/contactKeys.ts';
import { requestDone } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';

// Someone used our invite and we don't want them: forget them and the key made for them.
export const rejectRequest = (requestId: string): AppThunk => (dispatch) => {
  contactKeys.delete(requestId);
  dispatch(requestDone(requestId));
};
