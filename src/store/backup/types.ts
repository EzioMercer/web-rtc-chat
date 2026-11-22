// A backup being made or restored, for the progress screen. Counts are bytes of work (see backupWork) or of the
// file read.
export type BackupState = {
  running: boolean;
  title: string;
  done: number;
  total: number;
  startedAt: number;
};
