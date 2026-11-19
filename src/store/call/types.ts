export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'active';

export type CallState = {
  // Conversation the call belongs to (only one call at a time).
  key: string | null;
  status: CallStatus;
  video: boolean;
  mic: boolean;
  cam: boolean;
  remoteMic: boolean;
  remoteCam: boolean;
  // Bumped whenever the remote MediaStream (kept outside the store) gets new tracks.
  remoteStreamVersion: number;
};
