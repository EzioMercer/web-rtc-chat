import { deleteFileBytes } from '../../../core/history/deleteFileBytes.ts';
import { LIVE_MAX_MS } from '../../../core/location/config.ts';
import { memoryFileKey } from '../../../core/history/memoryFileKey.ts';
import { memoryFiles } from '../../../core/history/memoryFiles.ts';
import { fileTransfers } from '../../../core/webrtc/fileTransfers.ts';
import { messageDeleted } from '../../chat/chatSlice.ts';
import { MessageAuthor, MessageKind } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { stopLiveLocation } from '../location/stopLiveLocation.ts';

// Deletes one message on this device only ("Delete for me", or "Don't send" for ours still going out): the other side
// keeps theirs. A file still travelling stops, and its content is freed and deleted from storage. Our live location
// stops being shared first; if they haven't confirmed the stop, it is sent when the connection opens, until the
// location would have ended anyway.
export const deleteMessage = (key: string, id: string): AppThunk => (dispatch, getState) => {
  const message = getState().chat.conversations[key]?.find(m => m.id === id);

  if (!message) {
    return;
  }

  if (message.kind === MessageKind.File) {
    const file = memoryFileKey(key, id);

    fileTransfers.get(file)?.();
    fileTransfers.delete(file);
    memoryFiles.delete(file);

    if (message.url) {
      URL.revokeObjectURL(message.url);
    }

    void deleteFileBytes(key, id).catch((err: unknown) => console.error('File not deleted', err));
  }

  if (message.kind === MessageKind.Location && message.from === MessageAuthor.Me && message.liveUntil !== undefined) {
    dispatch(stopLiveLocation(key, id));
    dispatch(messageDeleted({ key, id, stopUntil: (message.at ?? Date.now()) + LIVE_MAX_MS }));

    return;
  }

  dispatch(messageDeleted({ key, id }));
};
