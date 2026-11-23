// How long a live location can run, to choose from when it starts.
export const LIVE_DURATIONS_MS = [15 * 60_000, 30 * 60_000, 60 * 60_000];

// Longest live location we accept from the other side (a little over the longest choice, for the trip).
export const LIVE_MAX_MS = 60 * 60_000 + 60_000;

// A live location is sent again once it moved this far (metres)...
export const LIVE_MOVE_M = 15;

// ...but no more often than this, so a phone that reports every second doesn't flood the connection.
export const LIVE_MIN_GAP_MS = 5_000;

// While it stays put, it is sent again this often, so the other side sees it is still live ("updated … ago").
export const LIVE_HEARTBEAT_MS = 30_000;

// Their live location counts as out of date (shown as such) when nothing came for this long.
export const LIVE_STALE_MS = 2 * 60_000;

// How long finding the place may take before we give up and say so.
export const FIX_TIMEOUT_MS = 20_000;
