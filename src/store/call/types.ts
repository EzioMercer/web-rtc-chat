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
  // Echo guard in this call: our microphone is turned off while they talk, so they can't hear themselves through our
  // speaker. Starts from the setting; the call's button changes it for this call only.
  echoGuard: boolean;
  // The question "turn on echo guard?" after they told us they hear an echo: not asked yet, showing, or asked (it
  // is asked once per call).
  echoPrompt: 'none' | 'open' | 'done';
  // Bumped whenever the remote MediaStream (kept outside the store) gets new tracks.
  remoteStreamVersion: number;
};
