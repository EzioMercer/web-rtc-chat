import { toStored } from '../history/toStored.ts';
import { savedFiles } from './savedFiles.ts';
import type { BackupSource } from './writeBackup.ts';

// How much there is to write, in bytes before encryption: what the progress bar counts.
export const backupWork = (source: BackupSource) => source.choices.reduce((sum, { id, media }) => {
  const messages = source.conversations[id] ?? [];
  const text = JSON.stringify(messages.map(toStored)).length;

  return sum + text + (media ? savedFiles(messages).reduce((total, file) => total + file.size, 0) : 0);
}, 0);
