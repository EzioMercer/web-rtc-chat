import { formatLastConnected } from '../../../utils/formatLastConnected.ts';
import { SessionStatus } from '../../../store/sessions/types.ts';

// Under the contact's name, as other messengers show it: online, or when we were last connected to them.
export const getStatusText = (status: SessionStatus, lastConnected: number | null, today: number): string => {
  switch (status) {
    case SessionStatus.Connected:
      return 'online';
    case SessionStatus.Connecting:
      return 'connecting…';
    default:
      return lastConnected === null ? 'not connected' : formatLastConnected(lastConnected, today);
  }
};
