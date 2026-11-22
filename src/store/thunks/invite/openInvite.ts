import { activeInvites } from '../../../core/signaling/activeInvites.ts';
import { parseInviteLink } from '../../../core/signaling/parseInviteLink.ts';
import { inviteError, inviteReceived } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';

// Someone gave us an invite (link, QR or pasted code). Returns whether it is usable.
export const openInvite = (text: string): AppThunk<boolean> => (dispatch) => {
  const payload = parseInviteLink(text);

  if (!payload) {
    dispatch(inviteError('That is not an invite link, or it is from an older version of the app. Ask for a new one.'));

    return false;
  }

  if ([...activeInvites.values()].some(invite => invite.commitment === payload.c)) {
    dispatch(inviteError('That is your own invite. Send it to the person you want to add.'));

    return false;
  }

  if (payload.e * 1000 < Date.now()) {
    dispatch(inviteError('This invite has expired. Ask for a new one.'));

    return false;
  }

  dispatch(inviteReceived({ commitment: payload.c, secret: payload.s, expiresAt: payload.e * 1000 }));

  return true;
};
