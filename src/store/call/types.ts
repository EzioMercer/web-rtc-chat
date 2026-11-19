export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'active';

export type CallState = {
  status: CallStatus;
  video: boolean;
  mic: boolean;
  cam: boolean;
  remoteMic: boolean;
  remoteCam: boolean;
  // Bumped whenever the remote MediaStream (kept outside the store) gets new tracks.
  remoteStreamVersion: number;
};
