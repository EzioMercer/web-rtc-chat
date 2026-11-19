import type { Session } from './types.ts';

// Live WebRTC objects. They are not serializable, so they live here instead of the Redux store.
export const sessions = new Map<string, Session>();

// Our microphone/camera during a call (only one call at a time).
export const media = {
  localStream: null as MediaStream | null,
};
