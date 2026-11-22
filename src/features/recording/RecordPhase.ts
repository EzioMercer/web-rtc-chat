// Idle; Starting: waiting for the microphone/camera; Recording: while the button is held; Locked: slid up, so it
// goes on without holding, until Send or Cancel.
export enum RecordPhase {
  Idle,
  Starting,
  Recording,
  Locked,
}
