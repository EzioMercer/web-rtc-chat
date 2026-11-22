import { nanoid } from '@reduxjs/toolkit';
import { packFile } from '../../../core/compression/packFile.ts';
import { memoryFileKey } from '../../../core/history/memoryFileKey.ts';
import { memoryFiles } from '../../../core/history/memoryFiles.ts';
import { formatBytes } from '../../../utils/formatBytes.ts';
import { overRelayLimit, RELAY_LIMIT_TEXT } from '../../../core/webrtc/overRelayLimit.ts';
import { sendFile } from '../../../core/webrtc/sendFile.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { addMessage, fileAdded, fileCompleted, fileFailed, fileProgress } from '../../chat/chatSlice.ts';
import { type MediaNote, NoteType, MessageAuthor, FileStatus } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { checkRoute } from '../session/checkRoute.ts';

// Progress is reported to the store at most this often (as a fraction of the file).
const PROGRESS_STEP = 0.01;

const MOVED_TO_RELAY = `Stopped: the connection moved to the TURN relay, where files can be up to ${RELAY_LIMIT_TEXT}.`;

// Sends each file over its own data channel, in parallel. `note` marks a recorded voice or video message.
// Text-like files are zipped first. Through the TURN relay only small files go out (counted zipped); a direct
// connection takes any size.
export const sendFiles = (key: string, files: File[], note?: MediaNote): AppThunk<Promise<void>> => async (
  dispatch,
) => {
  const session = sessions.get(key);
  const what = note ? `${note.type === NoteType.Voice ? 'Voice' : 'Video'} message` : null;

  if (session?.channel?.readyState !== 'open') {
    if (what) {
      dispatch(addMessage({ key, from: MessageAuthor.System, text: `${what} not sent: not connected.` }));
    }

    return;
  }

  // Right after connecting, the path may not be known yet.
  if (session.route === null) {
    await dispatch(checkRoute(session));
  }

  await Promise.all(files.map(async (file) => {
    const zipped = await packFile(file);
    // What actually travels.
    const wireSize = zipped?.size ?? file.size;

    if (overRelayLimit(session, wireSize)) {
      const size = zipped ? `${formatBytes(wireSize)} zipped` : formatBytes(file.size);
      const text = `${what ?? `"${file.name}"`} (${size}) not sent: through the TURN relay, `
        + `files can be up to ${RELAY_LIMIT_TEXT}. Bigger ones need a direct connection.`;

      dispatch(addMessage({ key, from: MessageAuthor.System, text }));

      return;
    }

    const id = nanoid();
    const url = URL.createObjectURL(file);
    let reported = 0;

    memoryFiles.set(memoryFileKey(key, id), file);

    dispatch(fileAdded({
      key,
      file: {
        id,
        from: MessageAuthor.Me,
        name: file.name,
        size: file.size,
        mime: file.type,
        url,
        transferred: 0,
        status: FileStatus.Transferring,
        ...(note ? { note } : {}),
        ...(zipped ? { packed: wireSize } : {}),
      },
    }));

    const onProgress = (sent: number) => {
      if (sent - reported >= wireSize * PROGRESS_STEP) {
        reported = sent;
        dispatch(fileProgress({ key, id, transferred: sent }));
      }
    };

    // The path can change during a long transfer: a big file stops if the connection moves to the relay.
    const shouldStop = () => (overRelayLimit(session, wireSize) ? MOVED_TO_RELAY : null);

    void sendFile(session.peer, id, file, { note, zipped, onProgress, shouldStop })
      .then(() => dispatch(fileCompleted({ key, id, url })))
      .catch((err: unknown) => dispatch(fileFailed({
        key,
        id,
        error: err instanceof Error && err.message === MOVED_TO_RELAY ? MOVED_TO_RELAY : undefined,
      })));
  }));
};
