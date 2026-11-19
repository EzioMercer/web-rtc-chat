import type { SessionRoute, SessionStatus } from '../../store/sessions/types.ts';

export const getStatusText = (status: SessionStatus, route: SessionRoute | undefined): string => {
  switch (status) {
    case 'connected':
      return route === 'relay' ? 'Online · through TURN relay' : 'Online · direct connection';
    case 'connecting':
      return 'Connecting…';
    case 'offline':
      return 'Offline';
    default:
      return 'Not connected';
  }
};
