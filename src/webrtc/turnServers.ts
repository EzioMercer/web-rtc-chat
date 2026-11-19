import { fetchIceServers } from '../turn/fetchIceServers.ts';
import { TURN_FETCH_TIMEOUT_MS, TURN_RETRY_MS, TURN_URL } from './config.ts';

let cached: { servers: RTCIceServer[]; until: number } | null = null;
let pending: Promise<void> | null = null;

const fresh = () => cached !== null && Date.now() < cached.until;

// TURN servers to use for a new connection: none until fetched, or when TURN isn't set up.
export const turnServers = (): RTCIceServer[] => (fresh() ? cached?.servers ?? [] : []);

// Fetches TURN credentials if needed. Never throws: without TURN, direct connections still work.
export const ensureTurnServers = (): Promise<void> => {
  if (!TURN_URL || fresh()) {
    return Promise.resolve();
  }

  pending ??= fetchIceServers(TURN_URL, TURN_FETCH_TIMEOUT_MS)
    .then(({ iceServers, ttl }) => {
      // Refresh 10 minutes early, so a connection that starts now gets credentials with time left.
      cached = { servers: iceServers, until: Date.now() + Math.max(ttl - 600, 60) * 1000 };
    })
    .catch((err: unknown) => {
      console.warn('TURN relay unavailable; direct connections only', err);
      cached = { servers: [], until: Date.now() + TURN_RETRY_MS };
    })
    .finally(() => {
      pending = null;
    });

  return pending;
};
