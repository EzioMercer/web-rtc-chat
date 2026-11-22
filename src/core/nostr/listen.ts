import { decrypt, getConversationKey } from 'nostr-tools/nip44';
import type { SubCloser } from 'nostr-tools/pool';
import type { Event } from 'nostr-tools/pure';
import { MAX_SKEW_S, RELAY_CHECK_MS, RELAYS, SIGNAL_KIND } from './config.ts';
import { pool } from './pool.ts';

type Handler = (mailbox: string, plaintext: string) => void;

// Biggest content we accept; real signals are a few KB.
const MAX_CONTENT = 100_000;
const SEEN_LIMIT = 2000;

const state = {
  sub: null as SubCloser | null,
  mailboxes: new Map<string, Uint8Array>(),
  handler: null as Handler | null,
  seen: new Set<string>(),
  timer: 0,
};

const onEvent = (event: Event) => {
  // The same event arrives once from every relay.
  if (state.seen.has(event.id) || event.content.length > MAX_CONTENT) {
    return;
  }

  state.seen.add(event.id);

  if (state.seen.size > SEEN_LIMIT) {
    state.seen = new Set([...state.seen].slice(-SEEN_LIMIT / 2));
  }

  const mailbox = event.tags.find(tag => tag[0] === 'p')?.[1];
  const sk = mailbox ? state.mailboxes.get(mailbox) : undefined;

  if (!mailbox || !sk) {
    return;
  }

  try {
    state.handler?.(mailbox, decrypt(event.content, getConversationKey(sk, event.pubkey)));
  } catch {
    // Not for us, or damaged.
    state.seen.add(event.id);
  }
};

const subscribe = () => {
  state.sub?.close();
  state.sub = null;

  if (!state.mailboxes.size) {
    return;
  }

  state.sub = pool.subscribeMany(
    RELAYS,
    { 'kinds': [SIGNAL_KIND], '#p': [...state.mailboxes.keys()], 'since': Math.floor(Date.now() / 1000) - MAX_SKEW_S },
    { onevent: onEvent },
  );
};

// Reconnects relays that dropped or never connected (the pool only retries ones that were connected once).
const check = () => {
  const status = pool.listConnectionStatus();

  if (RELAYS.some(url => !status.get(url))) {
    subscribe();
  }
};

// Drops every relay connection and opens fresh ones. After the phone kept the app in the background, its
// connections can look open but be dead, and then nothing reaches us.
export const reconnectRelays = () => {
  state.sub?.close();
  state.sub = null;
  pool.close(RELAYS);
  subscribe();
};

// Listens on exactly these mailboxes (public key -> secret key) and passes decrypted signals to `handler`.
export const listen = (mailboxes: Map<string, Uint8Array>, handler: Handler) => {
  const same = mailboxes.size === state.mailboxes.size && [...mailboxes.keys()].every(pk => state.mailboxes.has(pk));

  state.mailboxes = mailboxes;
  state.handler = handler;

  if (!state.timer) {
    state.timer = window.setInterval(check, RELAY_CHECK_MS);
  }

  if (!same) {
    subscribe();
  }
};
