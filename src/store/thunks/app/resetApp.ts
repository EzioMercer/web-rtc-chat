import { resetIdentity } from '../../../identity/resetIdentity.ts';

// Deletes the identity and contacts from this device and starts again.
export const resetApp = async () => {
  await resetIdentity();
  window.location.reload();
};
