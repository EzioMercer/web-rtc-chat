import { SimplePool } from 'nostr-tools/pool';

// One shared connection per relay for the whole app.
export const pool = new SimplePool({ enablePing: true, enableReconnect: true });
