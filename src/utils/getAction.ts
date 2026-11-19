import type { ManualState } from '../store/manual/types.ts';

export type Action = {
  label: string;
  disabled: boolean;
};

// Label and state of the single setup button, from the connection and whether the peer's code is filled in.
export const getAction = ({ role, status }: ManualState, hasPeerCode: boolean): Action => {
  if (status === 'generating' || status === 'connecting') {
    return { label: 'Please wait…', disabled: true };
  }

  if (role === 'host') {
    return { label: 'Connect', disabled: !hasPeerCode || status !== 'waiting' };
  }

  if (role === 'client') {
    return { label: 'Waiting for host…', disabled: true };
  }

  return { label: hasPeerCode ? 'Join' : 'Host', disabled: false };
};
