// STUN server lets each browser discover its public address.
export const STUN_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

// Our Cloudflare Worker that hands out TURN credentials (see worker/). VITE_TURN_URL replaces it; set it empty
// to make only direct connections.
export const TURN_URL = import.meta.env.VITE_TURN_URL ?? 'https://web-rtc-chat-turn.rovsanbadirxanov.workers.dev';

// Don't hold up a connection attempt longer than this waiting for TURN credentials.
export const TURN_FETCH_TIMEOUT_MS = 4000;

// After a failed credentials request, try again no sooner than this.
export const TURN_RETRY_MS = 60_000;

// Ask for new TURN credentials this long before the old ones expire, so open connections can move to them in time.
export const TURN_RENEW_EARLY_S = 20 * 60;

// How often open connections are checked: which path they use, and whether TURN credentials need renewing.
export const PATH_CHECK_MS = 60_000;

// While a connection goes through the TURN relay, look for a new path this often: a direct one if it works now,
// otherwise the relay again with fresh credentials.
export const TURN_RESTART_MS = 5 * 60_000;

// Video limit (bits per second) while a call goes through the TURN relay, where traffic counts toward the limit.
export const TURN_VIDEO_BITRATE = 500_000;

// Stop waiting for more ICE candidates after this long and use what was gathered.
export const ICE_GATHERING_TIMEOUT_MS = 5000;

// Contacts: send the request after this long at most; addresses found later follow through the relays.
export const ICE_GATHERING_EARLY_MS = 1500;

// Carries chat text and in-band signaling (renegotiation for calls, call control).
export const CONTROL_LABEL = 'control';

// One channel with this label is opened per file transfer.
export const FILE_LABEL = 'file';

// File transfer: chunk size that every browser accepts, and send-buffer limits for flow control.
export const FILE_CHUNK_SIZE = 16 * 1024;
export const FILE_BUFFER_HIGH = 4 * 1024 * 1024;
export const FILE_BUFFER_LOW = 1024 * 1024;

// Largest file (or voice/video message) that may go through the TURN relay, where every byte is paid for. Like the
// free tier of popular chat apps. On a direct connection there is no limit.
export const TURN_FILE_LIMIT = 10 * 1024 * 1024;

// Receiver's acknowledgement that the whole file arrived.
export const FILE_DONE = 'done';

// Addresses found within this long of each other go through relays in one event.
export const LATE_CANDIDATE_BATCH_MS = 500;

// At most this many addresses per relay event, so events stay small.
export const CANDIDATES_PER_EVENT = 20;

// Conversation key of the manual (copy-paste codes) connection.
export const MANUAL_KEY = 'manual';

// Give up waiting for the contact's answer (through relays) after this long: they are offline.
export const ANSWER_TIMEOUT_MS = 25_000;

// Once both sides have each other's addresses, finding a network path through two routers can take a while.
// The browser's own "failed" comes too early (see createSession), so this decides when to give up.
export const PATH_TIMEOUT_MS = 45_000;

// Getting ready to connect (TURN credentials) takes a few seconds at most; longer means it got stuck.
export const PREPARE_TIMEOUT_MS = 15_000;

// The open connection lost its path: if no new one is found within this time, start over from scratch.
export const RESCUE_TIMEOUT_MS = 15_000;

// Wait this long before each automatic reconnect attempt after a connection dropped.
export const RECONNECT_DELAYS_MS = [2000, 5000, 15_000];
