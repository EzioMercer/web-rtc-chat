import { fileAdded, fileCompleted, fileFailed, fileProgress } from '../../store/chat/chatSlice.ts';
import type { AppDispatch } from '../../store/store.ts';
import { countUnread } from '../../store/thunks/chat/countUnread.ts';
import { FILE_DONE } from './config.ts';
import { overRelayLimit, RELAY_LIMIT_TEXT } from './overRelayLimit.ts';
import { parseFileMeta } from './parseFileMeta.ts';
import { sessions } from './state.ts';
import type { FileMeta } from './types.ts';
import { MessageAuthor, FileStatus } from '../../store/chat/types.ts';

// Progress is reported to the store at most this often (as a fraction of the file).
const PROGRESS_STEP = 0.01;

const TOO_BIG = `Too big for the TURN relay (up to ${RELAY_LIMIT_TEXT}). It needs a direct connection.`;

// Collects a file sent by the peer over `channel` and adds it to `key`'s conversation.
// A big file is refused while the connection goes through the TURN relay, also if the path changes mid-way: the
// sender stops it too, but the relay's traffic is ours to pay for, so this side doesn't rely on that.
export const receiveFile = (key: string, channel: RTCDataChannel, dispatch: AppDispatch) => {
  const chunks: ArrayBuffer[] = [];
  let meta: FileMeta | null = null;
  let received = 0;
  let reported = 0;
  let done = false;
  let error: string | undefined;

  const finish = (file: FileMeta) => {
    const url = URL.createObjectURL(new Blob(chunks, { type: file.mime }));

    done = true;
    dispatch(fileCompleted({ key, id: file.id, url }));
    channel.send(FILE_DONE);
  };

  const refuseIfTooBig = (file: FileMeta) => {
    if (!overRelayLimit(sessions.get(key), file.size)) {
      return false;
    }

    error = TOO_BIG;
    channel.close();

    return true;
  };

  channel.binaryType = 'arraybuffer';

  channel.onmessage = (e: MessageEvent) => {
    if (!meta) {
      meta = parseFileMeta(e.data);

      if (!meta) {
        channel.close();

        return;
      }

      const file = { ...meta, from: MessageAuthor.Peer, url: null, transferred: 0, status: FileStatus.Transferring };

      dispatch(fileAdded({ key, file }));
      dispatch(countUnread(key));

      if (refuseIfTooBig(meta)) {
        return;
      }

      if (meta.size === 0) {
        finish(meta);
      }

      return;
    }

    if (!(e.data instanceof ArrayBuffer) || done || error || refuseIfTooBig(meta)) {
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
      dispatch(fileFailed({ key, id: meta.id, error }));
    }
  };
};
