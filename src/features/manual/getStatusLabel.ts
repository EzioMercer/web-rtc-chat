import { type ManualState, ManualStatus, ManualRole } from '../../store/manual/types.ts';

export const getStatusLabel = ({ role, status }: ManualState): string => {
  switch (status) {
    case ManualStatus.Generating:
      return 'Generating code…';
    case ManualStatus.Waiting:
      return role === ManualRole.Host ? 'Waiting for reply' : 'Waiting for host';
    case ManualStatus.Connecting:
      return 'Connecting…';
    case ManualStatus.Connected:
      return 'Connected';
    case ManualStatus.Disconnected:
      return 'Disconnected';
    case ManualStatus.Failed:
      return 'Connection failed';
    default:
      return 'Not connected';
  }
};
