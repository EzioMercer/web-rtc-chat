import { type RestorePlan, restoreBackup } from '../../../core/backup/restoreBackup.ts';
import { isSaving } from '../../../core/history/isSaving.ts';
import { contactKeys } from '../../../core/identity/contactKeys.ts';
import { createIdentity } from '../../../core/identity/createIdentity.ts';
import type { ProtectionChoice } from '../../../core/identity/types.ts';
import { vault } from '../../../core/identity/vault.ts';
import { storageUsage } from '../../../core/storage/storageUsage.ts';
import { formatBytes } from '../../../utils/formatBytes.ts';
import { keepScreenOn } from '../../../utils/keepScreenOn.ts';
import { backupEnded, backupStarted } from '../../backup/backupSlice.ts';
import { historyLoaded } from '../../chat/chatSlice.ts';
import { contactsLoaded } from '../../contacts/contactsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { errorMessage } from '../app/errorMessage.ts';
import { loadSavedChats } from '../app/loadSavedChats.ts';
import { backupRun } from './backupRun.ts';
import { goOffline } from './goOffline.ts';
import { goOnline } from './goOnline.ts';
import { progressReporter } from './progressReporter.ts';

// Room to spare beyond the backup's size: storage needs a little more than the file.
const SPACE_MARGIN = 1.1;

// Forgets a new identity whose restore failed, so the setup screen starts clean.
const forgetIdentity = () => {
  vault.mode = null;
  vault.meta = null;
  vault.vaultKey = null;
  vault.wrapKey = null;
  contactKeys.clear();
};

// Restores chats from a backup opened with readBackupPreview. On the setup screen `fresh` is the protection for
// the new identity, which is created first and saved only if the restore works (then openRestored opens the app).
// The app is offline meanwhile.
// Resolves with an error message, or null when it worked.
export const importBackup = (
  file: Blob,
  key: CryptoKey,
  plan: RestorePlan,
  fresh: ProtectionChoice | null,
): AppThunk<Promise<string | null>> => async (dispatch, getState) => {
  if (fresh) {
    try {
      await createIdentity(fresh, false);
    } catch (err) {
      forgetIdentity();

      return errorMessage(err);
    }
  }

  const space = isSaving() ? await storageUsage() : null;

  if (space && space.free < file.size * SPACE_MARGIN) {
    if (fresh) {
      forgetIdentity();
    }

    const missing = formatBytes(file.size * SPACE_MARGIN - space.free);

    return `Not enough space on this device: about ${missing} more is needed.`;
  }

  const controller = new AbortController();
  const release = await keepScreenOn();
  let error: string | null = null;

  backupRun.controller = controller;
  dispatch(backupStarted({ title: 'Restoring a backup', total: file.size }));

  try {
    if (!fresh) {
      await dispatch(goOffline());
    }

    const { contacts, chat } = getState();
    const result = await restoreBackup(
      file,
      key,
      plan,
      { contacts: contacts.list, unread: chat.unread },
      progressReporter(dispatch),
      controller.signal,
    );

    dispatch(contactsLoaded(result.contacts));

    if (isSaving()) {
      await dispatch(loadSavedChats());
    } else {
      const replaced = new Set([...plan.include, ...plan.remove]);

      const keep = <T>(record: Record<string, T>) => Object.fromEntries(
        Object.entries(record).filter(([id]) => !replaced.has(id)),
      );

      dispatch(historyLoaded({
        conversations: { ...keep(chat.conversations), ...result.conversations },
        unread: keep(chat.unread),
      }));
    }
  } catch (err) {
    error = controller.signal.aborted ? 'Restore stopped. Nothing was changed.' : errorMessage(err);
  } finally {
    backupRun.controller = null;
    release();
    dispatch(backupEnded());
  }

  if (!fresh) {
    await dispatch(goOnline());
  } else if (error) {
    forgetIdentity();
  }

  return error;
};
