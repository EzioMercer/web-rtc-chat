import { SessionStatus, SessionRoute } from '../../../store/sessions/types.ts';

export const getStatusText = (status: SessionStatus, route: SessionRoute | undefined): string => {
  switch (status) {
    case SessionStatus.Connected:
      return route === SessionRoute.Relay ? 'Online · through TURN relay' : 'Online · direct connection';
    case SessionStatus.Connecting:
      return 'Connecting…';
    case SessionStatus.Offline:
      return 'Offline';
    default:
      return 'Not connected';
  }
};
