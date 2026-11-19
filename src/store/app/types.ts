import type { ProtectionMode, StoredMode } from '../../identity/types.ts';

// loading: reading storage. setup: first launch. locked: waiting for the passkey or passphrase. ready: unlocked.
export type AppPhase = 'loading' | 'setup' | 'locked' | 'ready';

export type AppState = {
  phase: AppPhase;
  // Protection of the unlocked identity.
  mode: ProtectionMode | null;
  // Protection of the saved identity, while locked.
  lockedMode: StoredMode | null;
  busy: boolean;
  error: string | null;
};
