export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'active';

export type CallState = {
  // Conversation the call belongs to (only one call at a time).
  key: string | null;
  status: CallStatus;
  video: boolean;
  // We send our camera (false when a video call was answered with audio only).
  ownVideo: boolean;
  mic: boolean;
  cam: boolean;
  remoteMic: boolean;
  remoteCam: boolean;
  // We share our screen / they share theirs (it goes out instead of the camera).
  screen: boolean;
  remoteScreen: boolean;
  // Bumped whenever the remote MediaStream (kept outside the store) gets new tracks.
  remoteStreamVersion: number;
};
