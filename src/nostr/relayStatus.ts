import { RELAYS } from './config.ts';
import { pool } from './pool.ts';

// How many of the relays are connected right now.
export const relayStatus = (): { connected: number; total: number } => {
  const status = pool.listConnectionStatus();

  return { connected: RELAYS.filter(url => status.get(url)).length, total: RELAYS.length };
};
