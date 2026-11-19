export type CallSignal =
  | { t: 'call'; action: 'invite'; video: boolean }
  | { t: 'call'; action: 'accept' | 'decline' | 'end' }
  | { t: 'call'; action: 'state'; mic: boolean; cam: boolean };

// Everything sent over the control channel, as JSON.
export type ControlMessage =
  | { t: 'text'; text: string }
  | { t: 'sdp'; description: RTCSessionDescriptionInit }
  | { t: 'ice'; candidate: RTCIceCandidateInit }
  | CallSignal;

// First message of every file channel; binary chunks follow.
export type FileMeta = {
  id: string;
  name: string;
  size: number;
  mime: string;
};
