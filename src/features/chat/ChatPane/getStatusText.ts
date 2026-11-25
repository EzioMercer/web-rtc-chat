import { formatLastConnected } from '../../../utils/formatLastConnected.ts';
import { SessionStatus } from '../../../store/sessions/types.ts';

// Under the contact's name, as other messengers show it: online, or when we were last connected to them (also while
// connecting, which the bar below the header tells).
export const getStatusText = (status: SessionStatus, lastConnected: number | null, today: number): string => {
  if (status === SessionStatus.Connected) {
    return 'online';
  }

  return lastConnected === null ? 'not connected' : formatLastConnected(lastConnected, today);
};
