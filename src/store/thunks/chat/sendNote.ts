import type { Recording } from '../../../core/media/startRecorder.ts';
import { type MediaNote, NoteType } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { sendFiles } from './sendFiles.ts';

const EXTENSIONS: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

// Sends a recorded voice or video message: a file, with what the other side needs to show it as a message.
export const sendNote = (key: string, type: MediaNote['type'], recording: Recording): AppThunk<Promise<void>> => (
  dispatch,
) => {
  const { blob, duration, wave } = recording;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const extension = EXTENSIONS[blob.type] ?? (type === NoteType.Video ? 'webm' : 'audio');
  const name = `${type === NoteType.Video ? 'video' : 'voice'}-message-${stamp}.${extension}`;
  const file = new File([blob], name, { type: blob.type });

  return dispatch(sendFiles(key, [file], { type, duration, ...(wave ? { wave } : {}) }));
};
