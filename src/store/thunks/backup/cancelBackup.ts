import { backupRun } from './backupRun.ts';

// Stops the running backup or restore (the progress screen's Cancel).
export const cancelBackup = () => backupRun.controller?.abort();
