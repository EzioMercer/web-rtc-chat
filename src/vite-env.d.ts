/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Comma-separated relay URLs that replace the built-in ones (used for local testing).
  readonly VITE_RELAYS?: string;
  // URL of the Cloudflare Worker that hands out TURN credentials (worker/). Unset: no TURN relay.
  readonly VITE_TURN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
