// Public Nostr relays, the same for everyone so peers always meet on the same ones (like the STUN server).
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
];

export const RELAYS = import.meta.env.VITE_RELAYS ? import.meta.env.VITE_RELAYS.split(',') : DEFAULT_RELAYS;

// An ephemeral event kind (20000–29999): relays pass these on to listeners and don't store them.
export const SIGNAL_KIND = 20784;

// Signals older or newer than this (in seconds) are rejected, so recorded ones can't be replayed later.
export const MAX_SKEW_S = 300;

// Check relay connections this often and reconnect the ones that dropped.
export const RELAY_CHECK_MS = 30_000;
