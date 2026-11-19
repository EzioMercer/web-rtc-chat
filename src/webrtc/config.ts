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

// Conversation key of the manual (copy-paste codes) connection.
export const MANUAL_KEY = 'manual';

// Give up waiting for the contact's answer (through relays) after this long: they are offline.
export const ANSWER_TIMEOUT_MS = 25_000;

// Once both sides have each other's addresses, finding a network path through two routers can take a while.
// The browser's own "failed" comes too early (see createSession), so this decides when to give up.
export const PATH_TIMEOUT_MS = 45_000;

// Wait this long before each automatic reconnect attempt after a connection dropped.
export const RECONNECT_DELAYS_MS = [2000, 5000, 15_000];
