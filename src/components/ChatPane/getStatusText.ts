import type { SessionStatus } from '../../store/sessions/types.ts';

export const getStatusText = (status: SessionStatus): string => {
  switch (status) {
    case 'connected':
      return 'Online · direct connection';
    case 'connecting':
      return 'Connecting…';
    case 'offline':
      return 'Offline';
    default:
      return 'Not connected';
  }
};
