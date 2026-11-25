import { nanoid } from '@reduxjs/toolkit';
import { packFile } from '../../../core/compression/packFile.ts';
import { memoryFileKey } from '../../../core/history/memoryFileKey.ts';
import { memoryFiles } from '../../../core/history/memoryFiles.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { formatBytes } from '../../../utils/formatBytes.ts';
import { overRelayLimit, RELAY_LIMIT_TEXT } from '../../../core/webrtc/overRelayLimit.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { addMessage, fileAdded } from '../../chat/chatSlice.ts';
import { type MediaNote, NoteType, MessageAuthor, FileStatus } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';
import { checkRoute } from '../session/checkRoute.ts';
import { takeReply } from './takeReply.ts';
import { uploadFile } from './uploadFile.ts';

// Adds each file to the chat and sends it over its own data channel, in parallel (see uploadFile). `note` marks a
// recorded voice or video message. Without a connection they wait and go when one opens, like texts (see
// sendPending); the manual connection can't come back, so there they are not sent. Through the TURN relay only small
// files go out (counted zipped); a direct connection takes any size. The first one that goes answers the message
// chosen for a reply, if any (see takeReply).
export const sendFiles = (key: string, files: File[], note?: MediaNote): AppThunk<Promise<void>> => async (
  dispatch,
) => {
  const session = sessions.get(key);
  const open = session?.channel?.readyState === 'open';
  const what = note ? `${note.type === NoteType.Voice ? 'Voice' : 'Video'} message` : null;

  if (!open && key === MANUAL_KEY) {
    if (what) {
      dispatch(addMessage({ key, from: MessageAuthor.System, text: `${what} not sent: not connected.` }));
    }

    return;
  }

  let replyTo = dispatch(takeReply(key));

  // Right after connecting, the path may not be known yet.
  if (open && session.route === null) {
    await dispatch(checkRoute(session));
  }

  await Promise.all(files.map(async (file) => {
    const zipped = open ? await packFile(file) : null;
    // What actually travels.
    const wireSize = zipped?.size ?? file.size;

    if (open && overRelayLimit(session, wireSize)) {
      const size = zipped ? `${formatBytes(wireSize)} zipped` : formatBytes(file.size);
      const text = `${what ?? `"${file.name}"`} (${size}) not sent: through the TURN relay, `
        + `files can be up to ${RELAY_LIMIT_TEXT}. Bigger ones need a direct connection.`;

      dispatch(addMessage({ key, from: MessageAuthor.System, text }));

      return;
    }

    const id = nanoid();
    const answers = replyTo;

    replyTo = undefined;
    memoryFiles.set(memoryFileKey(key, id), file);
    dispatch(fileAdded({
      key,
      file: {
        id,
        from: MessageAuthor.Me,
        name: file.name,
        size: file.size,
        mime: file.type,
        url: URL.createObjectURL(file),
        transferred: 0,
        status: FileStatus.Waiting,
        at: Date.now(),
        ...(note ? { note } : {}),
        ...(answers === undefined ? {} : { replyTo: answers }),
      },
    }));

    if (open) {
      void dispatch(uploadFile(key, id, { file, zipped }));
    }
  }));

  if (!open) {
    void dispatch(connectContact(key));
  }
};
