import type { Session } from './types.ts';

// Live WebRTC objects. They are not serializable, so they live here instead of the Redux store.
export const sessions = new Map<string, Session>();

// Our microphone/camera during a call (only one call at a time).
export const media = {
  localStream: null as MediaStream | null,
  // While we share our screen: its picture, the sender it goes out on, and what that sender sent before
  // (our camera, or nothing in an audio call).
  screen: null as { stream: MediaStream; sender: RTCRtpSender; before: MediaStreamTrack | null } | null,
};

// Open file channels of each connection, so a connection isn't closed while files still go over it (see move).
export const fileChannels = new WeakMap<RTCPeerConnection, Set<RTCDataChannel>>();
