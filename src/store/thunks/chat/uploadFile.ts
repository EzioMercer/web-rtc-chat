import { packFile } from '../../../core/compression/packFile.ts';
import { loadFileBlob } from '../../../core/history/loadFileBlob.ts';
import { memoryFileKey } from '../../../core/history/memoryFileKey.ts';
import { fileTransfers } from '../../../core/webrtc/fileTransfers.ts';
import { overRelayLimit, RELAY_LIMIT_TEXT } from '../../../core/webrtc/overRelayLimit.ts';
import { sendFile } from '../../../core/webrtc/sendFile.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { fileCompleted, fileFailed, fileProgress, fileRestarted, fileWaiting } from '../../chat/chatSlice.ts';
import { type FileMessage, FileStatus, MessageAuthor, MessageKind } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { replyField } from '../../chat/replyField.ts';
import { checkRoute } from '../session/checkRoute.ts';

// Progress is reported to the store at most this often (as a fraction of the file).
const PROGRESS_STEP = 0.01;

const MOVED_TO_RELAY = `Stopped: the connection moved to the TURN relay, where files can be up to ${RELAY_LIMIT_TEXT}.`;
const TOO_BIG = `Not sent: through the TURN relay, files can be up to ${RELAY_LIMIT_TEXT}.`;
const DELETED = 'Deleted.';

// The file and its zipped form, when the caller already has them (a file just chosen).
type Prepared = { file: File; zipped: Blob | null };

// Sends our waiting file `id` from the start over its own data channel: right after it is chosen, again when the
// connection opens after it broke, or after Send again. Its content comes from this session's memory, or from
// storage after a reload. Text-like files are zipped first; through the TURN relay only small ones go (counted
// zipped). If the connection breaks, it waits for the next one (see sendPending).
export const uploadFile = (key: string, id: string, prepared?: Prepared): AppThunk<Promise<void>> => async (
  dispatch,
  getState,
) => {
  const session = sessions.get(key);
  const transfer = memoryFileKey(key, id);

  const find = () => getState().chat.conversations[key]?.find(
    (m): m is FileMessage => m.kind === MessageKind.File && m.id === id && m.from === MessageAuthor.Me,
  );

  const message = find();

  if (!message || message.status !== FileStatus.Waiting || session?.channel?.readyState !== 'open'
    || fileTransfers.has(transfer)) {
    return;
  }

  let deleted = false;

  const stop = () => {
    deleted = true;
  };

  // From now on it can be deleted (see deleteMessage), also while it is being read or zipped.
  fileTransfers.set(transfer, stop);

  try {
    if (session.route === null) {
      await dispatch(checkRoute(session));
    }

    const file = prepared?.file ?? await loadFileBlob(key, message)
      .then(blob => new File([blob], message.name, { type: message.mime }))
      .catch((err: unknown) => {
        dispatch(fileFailed({ key, id, error: err instanceof Error ? err.message : undefined }));

        return null;
      });

    if (!file) {
      return;
    }

    const zipped = prepared ? prepared.zipped : await packFile(file);
    // What actually travels.
    const wireSize = zipped?.size ?? file.size;
    let reported = 0;

    if (deleted) {
      return;
    }

    if (overRelayLimit(session, wireSize)) {
      dispatch(fileFailed({ key, id, error: TOO_BIG }));

      return;
    }

    dispatch(fileRestarted({ key, id, packed: zipped ? wireSize : undefined }));

    const onProgress = (sent: number) => {
      if (sent - reported >= wireSize * PROGRESS_STEP) {
        reported = sent;
        dispatch(fileProgress({ key, id, transferred: sent }));
      }
    };

    // The path can change during a long transfer: a big file stops if the connection moves to the relay. It also
    // stops when we delete it.
    const shouldStop = () => {
      if (deleted) {
        return DELETED;
      }

      return overRelayLimit(session, wireSize) ? MOVED_TO_RELAY : null;
    };

    await sendFile(session.peer, id, file, {
      note: message.note,
      zipped,
      onProgress,
      shouldStop,
      waited: Math.max(0, Date.now() - (message.at ?? Date.now())),
      // As it is now: the message it answers may have been deleted meanwhile.
      ...replyField(find() ?? message),
    });
    dispatch(fileCompleted({ key, id, url: find()?.url ?? null }));
  } catch (err) {
    if (deleted) {
      return;
    }

    // Anything else broke the transfer (the connection, or the channel): it goes again with the next connection.
    if (err instanceof Error && err.message === MOVED_TO_RELAY) {
      dispatch(fileFailed({ key, id, error: MOVED_TO_RELAY }));
    } else {
      dispatch(fileWaiting({ key, id }));
    }
  } finally {
    if (fileTransfers.get(transfer) === stop) {
      fileTransfers.delete(transfer);
    }
  }
};
