import { vault } from '../../../identity/vault.ts';
import { parseInviteLink } from '../../../signaling/parseInviteLink.ts';
import { inviteError, inviteReceived } from '../../invites/invitesSlice.ts';
import type { AppThunk } from '../../store.ts';

// Someone gave us an invite (link, QR or pasted code). Returns whether it is usable.
export const openInvite = (text: string): AppThunk<boolean> => (dispatch) => {
  const payload = parseInviteLink(text);

  if (!payload) {
    dispatch(inviteError('That is not an invite link.'));

    return false;
  }

  if (payload.k === vault.publicKey) {
    dispatch(inviteError('That is your own invite. Send it to the person you want to add.'));

    return false;
  }

  if (payload.e * 1000 < Date.now()) {
    dispatch(inviteError('This invite has expired. Ask for a new one.'));

    return false;
  }

  dispatch(inviteReceived({ identity: payload.k, secret: payload.s, expiresAt: payload.e * 1000 }));

  return true;
};
