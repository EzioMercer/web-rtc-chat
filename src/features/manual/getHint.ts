import { type ManualState, ManualStatus, ManualRole } from '../../store/manual/types.ts';

// What to do next, shown under the setup form.
export const getHint = ({ role, status }: ManualState): string => {
  if (status === ManualStatus.Connecting) {
    return 'Connecting…';
  }

  if (role === ManualRole.Host) {
    return 'You are the host. Send your code to the peer, then paste their reply above and press Connect.';
  }

  if (role === ManualRole.Client) {
    return 'You are the client. Send your code back to the host. The chat opens once they connect.';
  }

  return '';
};
