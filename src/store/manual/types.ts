export type Role = 'none' | 'host' | 'client';

export type Status = 'idle' | 'generating' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'failed';

// The manual connection: codes copied by hand, without contacts or relays.
export type ManualState = {
  role: Role;
  status: Status;
  myCode: string;
  error: string | null;
  // Safety words computed from both sides' certificate fingerprints, once connected.
  safetyWords: string[] | null;
};
