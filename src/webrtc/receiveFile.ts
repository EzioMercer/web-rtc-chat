import { fileAdded, fileCompleted, fileFailed, fileProgress } from '../store/chat/chatSlice.ts';
import type { AppDispatch } from '../store/store.ts';
import { countUnread } from '../store/thunks/chat/countUnread.ts';
import { FILE_DONE } from './config.ts';
import { parseFileMeta } from './parseFileMeta.ts';
import type { FileMeta } from './types.ts';

// Progress is reported to the store at most this often (as a fraction of the file).
const PROGRESS_STEP = 0.01;

// Collects a file sent by the peer over `channel` and adds it to `key`'s conversation.
export const receiveFile = (key: string, channel: RTCDataChannel, dispatch: AppDispatch) => {
  const chunks: ArrayBuffer[] = [];
  let meta: FileMeta | null = null;
  let received = 0;
  let reported = 0;
  let done = false;

  const finish = (file: FileMeta) => {
    const url = URL.createObjectURL(new Blob(chunks, { type: file.mime }));

    done = true;
    dispatch(fileCompleted({ key, id: file.id, url }));
    channel.send(FILE_DONE);
  };

  channel.binaryType = 'arraybuffer';

  channel.onmessage = (e: MessageEvent) => {
    if (!meta) {
      meta = parseFileMeta(e.data);

      if (!meta) {
        channel.close();

        return;
      }

      dispatch(fileAdded({ key, file: { ...meta, from: 'peer', url: null, transferred: 0, status: 'transferring' } }));
      dispatch(countUnread(key));

      if (meta.size === 0) {
        finish(meta);
      }

      return;
    }

    if (!(e.data instanceof ArrayBuffer)) {
      return;
    }

    chunks.push(e.data);
    received += e.data.byteLength;

    if (received >= meta.size) {
      finish(meta);
    } else if (received - reported >= meta.size * PROGRESS_STEP) {
      reported = received;
      dispatch(fileProgress({ key, id: meta.id, transferred: received }));
    }
  };

  channel.onclose = () => {
    if (meta && !done) {
      dispatch(fileFailed({ key, id: meta.id }));
    }
  };
};
