import { contactKeys } from '../identity/contactKeys.ts';
import { activeInvites } from './activeInvites.ts';

// Closes our invite with mailbox `pk`, and forgets the key made for whoever would have used it.
export const dropInvite = (pk: string) => {
  const invite = activeInvites.get(pk);

  if (invite) {
    contactKeys.delete(invite.id);
    activeInvites.delete(pk);
  }
};
