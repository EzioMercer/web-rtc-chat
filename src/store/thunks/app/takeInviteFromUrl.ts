import { pendingInvite } from './pendingInvite.ts';

// Moves an `#invite=...` out of the address bar (so a reload doesn't reuse it) into memory.
export const takeInviteFromUrl = () => {
  const { hash, pathname, search } = window.location;

  if (hash.includes('invite=')) {
    pendingInvite.text = hash;
    window.history.replaceState(window.history.state, '', pathname + search);
  }
};
