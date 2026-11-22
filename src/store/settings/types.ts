// Echo guard: auto (on only in browsers known to cause echo), on or off. The starting value for each call; the
// call's own button can change it for that call.
// Saved or sent as numbers: never change a value; add new ones at the end.
export enum EchoGuardSetting {
  Auto = 0,
  On = 1,
  Off = 2,
}

// Settings of this device, saved encrypted with the contacts (nowhere in Temporary mode). Device-specific on purpose:
// echo depends on the device, so they are never synced or put in backups.
export type SettingsState = {
  echoGuard: EchoGuardSetting;
};
