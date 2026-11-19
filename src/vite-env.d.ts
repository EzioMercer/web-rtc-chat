/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Comma-separated relay URLs that replace the built-in ones (used for local testing).
  readonly VITE_RELAYS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
