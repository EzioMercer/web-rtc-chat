// Echo guard: auto (on only in browsers known to cause echo), on or off. The starting value for each call; the
// call's own button can change it for that call.
export enum EchoGuardSetting {
  Auto,
  On,
  Off,
}

// Settings of this device, saved encrypted with the contacts (nowhere in Temporary mode). Device-specific on purpose:
// echo depends on the device, so they are never synced or put in backups.
export type SettingsState = {
  echoGuard: EchoGuardSetting;
};
