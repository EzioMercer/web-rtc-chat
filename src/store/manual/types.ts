export enum ManualRole {
  None,
  Host,
  Client,
}

export enum ManualStatus {
  Idle,
  Generating,
  Waiting,
  Connecting,
  Connected,
  Disconnected,
  Failed,
}

// The manual connection: codes copied by hand, without contacts or relays.
export type ManualState = {
  role: ManualRole;
  status: ManualStatus;
  myCode: string;
  error: string | null;
  // Safety words computed from both sides' certificate fingerprints, once connected.
  safetyWords: string[] | null;
};
