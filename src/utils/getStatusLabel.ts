import type { ConnectionState } from '../store/connection/types.ts';

export const getStatusLabel = ({ role, status }: ConnectionState): string => {
  switch (status) {
    case 'generating':
      return 'Generating code…';
    case 'waiting':
      return role === 'host' ? 'Waiting for reply' : 'Waiting for host';
    case 'connecting':
      return 'Connecting…';
    case 'connected':
      return 'Connected';
    case 'disconnected':
      return 'Disconnected';
    case 'failed':
      return 'Connection failed';
    default:
      return 'Not connected';
  }
};
