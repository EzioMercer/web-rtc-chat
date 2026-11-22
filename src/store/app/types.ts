import type { ProtectionMode, StoredMode } from '../../core/identity/types.ts';

// loading: reading storage. setup: first launch. locked: waiting for the passkey or passphrase. ready: unlocked.
// otherTab: the app is open in another tab (see claimTab).
export enum AppPhase {
  Loading,
  Setup,
  Locked,
  Ready,
  OtherTab,
}

export type AppState = {
  phase: AppPhase;
  // Protection of the unlocked identity.
  mode: ProtectionMode | null;
  // Protection of the saved identity, while locked.
  lockedMode: StoredMode | null;
  busy: boolean;
  error: string | null;
  // Offline on purpose while a backup is made or restored: no relays, no connections (see goOffline).
  paused: boolean;
};
