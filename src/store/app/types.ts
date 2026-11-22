import type { ProtectionMode, StoredMode } from '../../core/identity/types.ts';

// loading: reading storage. setup: first launch. locked: waiting for the passkey or passphrase. ready: unlocked.
export enum AppPhase {
  Loading,
  Setup,
  Locked,
  Ready,
}

export type AppState = {
  phase: AppPhase;
  // Protection of the unlocked identity.
  mode: ProtectionMode | null;
  // Protection of the saved identity, while locked.
  lockedMode: StoredMode | null;
  busy: boolean;
  error: string | null;
};
