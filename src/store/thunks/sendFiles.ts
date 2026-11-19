import { nanoid } from '@reduxjs/toolkit';
import { sendFile } from '../../webrtc/sendFile.ts';
import { rtc } from '../../webrtc/state.ts';
import { fileAdded, fileCompleted, fileFailed, fileProgress } from '../chat/chatSlice.ts';
import type { AppThunk } from '../store.ts';

// Progress is reported to the store at most this often (as a fraction of the file).
const PROGRESS_STEP = 0.01;

// Sends each file over its own data channel, in parallel.
export const sendFiles = (files: File[]): AppThunk => (dispatch, getState) => {
  const { peer } = rtc;

  if (!peer || getState().connection.status !== 'connected') {
    return;
  }

  files.forEach((file) => {
    const id = nanoid();
    const url = URL.createObjectURL(file);
    let reported = 0;

    dispatch(fileAdded({
      id,
      from: 'me',
      name: file.name,
      size: file.size,
      mime: file.type,
      url,
      transferred: 0,
      status: 'transferring',
    }));

    const onProgress = (sent: number) => {
      if (sent - reported >= file.size * PROGRESS_STEP) {
        reported = sent;
        dispatch(fileProgress({ id, transferred: sent }));
      }
    };

    sendFile(peer, id, file, onProgress)
      .then(() => dispatch(fileCompleted({ id, url })))
      .catch(() => dispatch(fileFailed(id)));
  });
};
