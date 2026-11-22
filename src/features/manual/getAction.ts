import { type ManualState, ManualStatus, ManualRole } from '../../store/manual/types.ts';

export type Action = {
  label: string;
  disabled: boolean;
};

// Label and state of the single setup button, from the connection and whether the peer's code is filled in.
export const getAction = ({ role, status }: ManualState, hasPeerCode: boolean): Action => {
  if (status === ManualStatus.Generating || status === ManualStatus.Connecting) {
    return { label: 'Please wait…', disabled: true };
  }

  if (role === ManualRole.Host) {
    return { label: 'Connect', disabled: !hasPeerCode || status !== ManualStatus.Waiting };
  }

  if (role === ManualRole.Client) {
    return { label: 'Waiting for host…', disabled: true };
  }

  return { label: hasPeerCode ? 'Join' : 'Host', disabled: false };
};
