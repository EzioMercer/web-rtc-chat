import { resetIdentity } from '../../../core/identity/resetIdentity.ts';

// Deletes the identity, contacts and chats from this device and starts again.
export const resetApp = async () => {
  await resetIdentity();
  window.location.reload();
};
