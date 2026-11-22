import { backupFileName } from '../../../core/backup/backupFileName.ts';
import { backupWork } from '../../../core/backup/backupWork.ts';
import type { ByteSink } from '../../../core/backup/ByteSink.ts';
import { openMemoryDownload } from '../../../core/backup/openMemoryDownload.ts';
import { openStreamDownload } from '../../../core/backup/openStreamDownload.ts';
import type { ChatChoice } from '../../../core/backup/types.ts';
import { writeBackup } from '../../../core/backup/writeBackup.ts';
import { keepScreenOn } from '../../../utils/keepScreenOn.ts';
import { backupEnded, backupStarted } from '../../backup/backupSlice.ts';
import type { AppThunk } from '../../store.ts';
import { errorMessage } from '../app/errorMessage.ts';
import { backupRun } from './backupRun.ts';
import { goOffline } from './goOffline.ts';
import { goOnline } from './goOnline.ts';
import { progressReporter } from './progressReporter.ts';

// Makes a backup of the chosen chats, locked with `password`, and downloads it. The app is offline meanwhile.
// Resolves with an error message, or null when it worked.
export const exportBackup = (choices: ChatChoice[], password: string): AppThunk<Promise<string | null>> => async (
  dispatch,
  getState,
) => {
  const controller = new AbortController();
  const release = await keepScreenOn();
  let sink: ByteSink | null = null;

  backupRun.controller = controller;
  dispatch(backupStarted({ title: 'Making a backup', total: 0 }));

  try {
    await dispatch(goOffline());

    const { contacts, chat } = getState();
    const source = { contacts: contacts.list, conversations: chat.conversations, choices };
    const name = backupFileName();

    dispatch(backupStarted({ title: 'Making a backup', total: backupWork(source) }));
    sink = await openStreamDownload(name) ?? openMemoryDownload(name);
    await writeBackup(sink, password, source, progressReporter(dispatch), controller.signal);

    return null;
  } catch (err) {
    sink?.abort();

    return controller.signal.aborted ? 'Backup stopped. The file it started is incomplete.' : errorMessage(err);
  } finally {
    backupRun.controller = null;
    release();
    dispatch(backupEnded());
    await dispatch(goOnline());
  }
};
