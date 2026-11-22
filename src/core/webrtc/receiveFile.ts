import { inflateBlob } from '../compression/inflateBlob.ts';
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
const DAMAGED = 'Arrived damaged (could not unzip it).';

// Bytes that travel: the zipped size when it was sent zipped.
const wireSize = (file: FileMeta) => file.packed ?? file.size;

// Collects a file sent by the peer over `channel` (unzipping it when it was sent zipped) and adds it to `key`'s
// conversation.
// A big file is refused while the connection goes through the TURN relay, also if the path changes mid-way: the
// sender stops it too, but the relay's traffic is ours to pay for, so this side doesn't rely on that.
export const receiveFile = (key: string, channel: RTCDataChannel, dispatch: AppDispatch) => {
  const chunks: ArrayBuffer[] = [];
  let meta: FileMeta | null = null;
  let received = 0;
  let reported = 0;
  let done = false;
  let error: string | undefined;

  const finish = async (file: FileMeta) => {
    const arrived = new Blob(chunks, { type: file.mime });

    done = true;

    try {
      // Unzipped, it must be exactly the size they announced: no more (a "zip bomb") and no less.
      const content = file.packed === undefined ? arrived : await inflateBlob(arrived, file.size, file.mime);

      if (content.size !== file.size) {
        throw new Error(DAMAGED);
      }

      dispatch(fileCompleted({ key, id: file.id, url: URL.createObjectURL(content) }));
      channel.send(FILE_DONE);
    } catch {
      dispatch(fileFailed({ key, id: file.id, error: DAMAGED }));
      channel.close();
    }
  };

  const refuseIfTooBig = (file: FileMeta) => {
    if (!overRelayLimit(sessions.get(key), wireSize(file))) {
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

      if (wireSize(meta) === 0) {
        void finish(meta);
      }

      return;
    }

    if (!(e.data instanceof ArrayBuffer) || done || error || refuseIfTooBig(meta)) {
      return;
    }

    chunks.push(e.data);
    received += e.data.byteLength;

    if (received >= wireSize(meta)) {
      void finish(meta);
    } else if (received - reported >= wireSize(meta) * PROGRESS_STEP) {
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
