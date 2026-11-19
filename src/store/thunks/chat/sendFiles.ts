import { nanoid } from '@reduxjs/toolkit';
import { sendFile } from '../../../webrtc/sendFile.ts';
import { sessions } from '../../../webrtc/state.ts';
import { fileAdded, fileCompleted, fileFailed, fileProgress } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';

// Progress is reported to the store at most this often (as a fraction of the file).
const PROGRESS_STEP = 0.01;

// Sends each file over its own data channel, in parallel.
export const sendFiles = (key: string, files: File[]): AppThunk => (dispatch) => {
  const session = sessions.get(key);

  if (session?.channel?.readyState !== 'open') {
    return;
  }

  files.forEach((file) => {
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
      },
    }));

    const onProgress = (sent: number) => {
      if (sent - reported >= file.size * PROGRESS_STEP) {
        reported = sent;
        dispatch(fileProgress({ key, id, transferred: sent }));
      }
    };

    sendFile(session.peer, id, file, onProgress)
      .then(() => dispatch(fileCompleted({ key, id, url })))
      .catch(() => dispatch(fileFailed({ key, id })));
  });
};
