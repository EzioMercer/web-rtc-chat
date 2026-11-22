import { vault } from '../../../core/identity/vault.ts';
import { newSecret } from '../../../core/signaling/newSecret.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { secretProposed } from '../../contacts/contactsSlice.ts';
import type { AppThunk } from '../../store.ts';

// Each time the direct connection opens, one side (always the same one) proposes a new mailbox secret.
// It travels over the encrypted direct connection, so relays never see it, and a copied invite or an old
// secret stops working.
export const startRotation = (id: string): AppThunk => (dispatch, getState) => {
  const contact = getState().contacts.list.find(c => c.id === id);

  if (!contact || vault.publicKey > contact.identity) {
    return;
  }

  const secret = newSecret();

  dispatch(secretProposed({ id, secret }));
  sendControl(id, { t: 'rotate', secret });
};
