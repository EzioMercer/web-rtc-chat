import { nanoid } from '@reduxjs/toolkit';
import { formatBytes } from '../../../utils/formatBytes.ts';
import { overRelayLimit, RELAY_LIMIT_TEXT } from '../../../webrtc/overRelayLimit.ts';
import { sendFile } from '../../../webrtc/sendFile.ts';
import { sessions } from '../../../webrtc/state.ts';
import { addMessage, fileAdded, fileCompleted, fileFailed, fileProgress } from '../../chat/chatSlice.ts';
import type { MediaNote } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { checkRoute } from '../session/checkRoute.ts';

// Progress is reported to the store at most this often (as a fraction of the file).
const PROGRESS_STEP = 0.01;

const MOVED_TO_RELAY = `Stopped: the connection moved to the TURN relay, where files can be up to ${RELAY_LIMIT_TEXT}.`;

// Sends each file over its own data channel, in parallel. `note` marks a recorded voice or video message.
// Through the TURN relay only small files go out; a direct connection takes any size.
export const sendFiles = (key: string, files: File[], note?: MediaNote): AppThunk<Promise<void>> => async (
  dispatch,
) => {
  const session = sessions.get(key);
  const what = note ? `${note.type === 'voice' ? 'Voice' : 'Video'} message` : null;

  if (session?.channel?.readyState !== 'open') {
    if (what) {
      dispatch(addMessage({ key, from: 'system', text: `${what} not sent: not connected.` }));
    }

    return;
  }

  // Right after connecting, the path may not be known yet.
  if (session.route === null) {
    await dispatch(checkRoute(session));
  }

  files.forEach((file) => {
    if (overRelayLimit(session, file.size)) {
      const text = `${what ?? `"${file.name}"`} (${formatBytes(file.size)}) not sent: through the TURN relay, `
        + `files can be up to ${RELAY_LIMIT_TEXT}. Bigger ones need a direct connection.`;

      dispatch(addMessage({ key, from: 'system', text }));

      return;
    }

    const id = nanoid();
    const url = URL.createObjectURL(file);
    let reported = 0;

    dispatch(fileAdded({
      key,
      file: {
        id,
        from: 'me',
        name: file.name,
        size: file.size,
        mime: file.type,
        url,
        transferred: 0,
        status: 'transferring',
        ...(note ? { note } : {}),
      },
    }));

    const onProgress = (sent: number) => {
      if (sent - reported >= file.size * PROGRESS_STEP) {
        reported = sent;
        dispatch(fileProgress({ key, id, transferred: sent }));
      }
    };

    // The path can change during a long transfer: a big file stops if the connection moves to the relay.
    const shouldStop = () => (overRelayLimit(session, file.size) ? MOVED_TO_RELAY : null);

    sendFile(session.peer, id, file, { note, onProgress, shouldStop })
      .then(() => dispatch(fileCompleted({ key, id, url })))
      .catch((err: unknown) => dispatch(fileFailed({
        key,
        id,
        error: err instanceof Error && err.message === MOVED_TO_RELAY ? MOVED_TO_RELAY : undefined,
      })));
  });
};
