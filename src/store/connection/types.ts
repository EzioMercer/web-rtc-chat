export type Role = 'none' | 'host' | 'client';

export type Status = 'idle' | 'generating' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export type ConnectionState = {
  role: Role;
  status: Status;
  myCode: string;
  error: string | null;
};
