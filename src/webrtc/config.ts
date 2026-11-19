// STUN server lets each browser discover its public address.
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// Stop waiting for more ICE candidates after this long and use what was gathered.
export const ICE_GATHERING_TIMEOUT_MS = 5000;

// Carries chat text and in-band signaling (renegotiation for calls, call control).
export const CONTROL_LABEL = 'control';

// One channel with this label is opened per file transfer.
export const FILE_LABEL = 'file';

// File transfer: chunk size that every browser accepts, and send-buffer limits for flow control.
export const FILE_CHUNK_SIZE = 16 * 1024;
export const FILE_BUFFER_HIGH = 4 * 1024 * 1024;
export const FILE_BUFFER_LOW = 1024 * 1024;

// Receiver's acknowledgement that the whole file arrived.
export const FILE_DONE = 'done';
