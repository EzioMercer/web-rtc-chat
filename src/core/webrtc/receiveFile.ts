import { inflateBlob } from '../compression/inflateBlob.ts';
import { memoryFileKey } from '../history/memoryFileKey.ts';
import { memoryFiles } from '../history/memoryFiles.ts';
import { fileAdded, fileCompleted, fileFailed, fileProgress, fileRestarted } from '../../store/chat/chatSlice.ts';
import { peerMessageId } from '../../store/chat/peerMessageId.ts';
import type { AppDispatch } from '../../store/store.ts';
import { countUnread } from '../../store/thunks/chat/countUnread.ts';
import { findMessage } from '../../store/thunks/chat/findMessage.ts';
import { FILE_DONE, RESEND_MS } from './config.ts';
import { fileTransfers } from './fileTransfers.ts';
import { overRelayLimit, RELAY_LIMIT_TEXT } from './overRelayLimit.ts';
import { parseFileMeta } from './parseFileMeta.ts';
import { sessions } from './state.ts';
import type { FileMeta } from './types.ts';
import { MessageAuthor, FileStatus, MessageKind } from '../../store/chat/types.ts';

// Progress is reported to the store at most this often (as a fraction of the file).
const PROGRESS_STEP = 0.01;

const TOO_BIG = `Too big for the TURN relay (up to ${RELAY_LIMIT_TEXT}). It needs a direct connection.`;
const DAMAGED = 'Arrived damaged (could not unzip it).';

// Bytes that travel: the zipped size when it was sent zipped.
const wireSize = (file: FileMeta) => file.packed ?? file.size;

// Collects a file sent by the peer over `channel` (unzipping it when it was sent zipped) and adds it to `key`'s
// conversation, where its time belongs if it waited on their side. They send a file again when the connection broke
// before we confirmed it: one that broke here comes again into the same message, and one we have (or deleted) is
// just confirmed.
// A big file is refused while the connection goes through the TURN relay, also if the path changes mid-way: the
// sender stops it too, but the relay's traffic is ours to pay for, so this side doesn't rely on that.
export const receiveFile = (key: string, channel: RTCDataChannel, dispatch: AppDispatch) => {
  const chunks: ArrayBuffer[] = [];
  let meta: FileMeta | null = null;
  // Our id for it (see peerMessageId).
  let id = '';
  let received = 0;
  let reported = 0;
  let done = false;
  // We deleted it while it was coming, or a newer copy of it took over.
  let deleted = false;
  // A copy of a file we have: confirmed, and the rest of it ignored.
  let ignoring = false;
  let error: string | undefined;

  const stop = () => {
    deleted = true;
    chunks.length = 0;
    channel.close();
  };

  const finish = async (file: FileMeta) => {
    const arrived = new Blob(chunks, { type: file.mime });

    done = true;

    try {
      // Unzipped, it must be exactly the size they announced: no more (a "zip bomb") and no less.
      const content = file.packed === undefined ? arrived : await inflateBlob(arrived, file.size, file.mime);

      if (content.size !== file.size) {
        throw new Error(DAMAGED);
      }

      // Deleted while it was being unzipped.
      if (deleted) {
        return;
      }

      memoryFiles.set(memoryFileKey(key, id), content);
      dispatch(fileCompleted({ key, id, url: URL.createObjectURL(content) }));
      channel.send(FILE_DONE);
    } catch {
      dispatch(fileFailed({ key, id, error: DAMAGED }));
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

  // Its first message: what file it is.
  const start = (data: unknown) => {
    meta = parseFileMeta(data);
    id = (meta && peerMessageId(meta.id)) ?? '';

    const known = id ? dispatch(findMessage(key, id)) : undefined;

    if (!meta || !id) {
      meta = null;
      channel.close();

      return false;
    }

    // We have it (only our confirmation was lost), or deleted it: they need only the confirmation.
    if (known && (known.kind === MessageKind.Deleted
      || (known.kind === MessageKind.File && known.from === MessageAuthor.Peer && known.status === FileStatus.Done))) {
      meta = null;
      ignoring = true;
      channel.send(FILE_DONE);

      return false;
    }

    // Any other message with this id would be replaced: refused.
    if (known && (known.kind !== MessageKind.File || known.from !== MessageAuthor.Peer)) {
      meta = null;
      channel.close();

      return false;
    }

    // Before it shows: it can be deleted from then on. An older copy still coming stops.
    fileTransfers.get(memoryFileKey(key, id))?.();
    fileTransfers.set(memoryFileKey(key, id), stop);

    if (known) {
      dispatch(fileRestarted({ key, id, packed: meta.packed }));

      return true;
    }

    const { name, size, mime, note, packed, waited, replyTo } = meta;

    dispatch(fileAdded({
      key,
      file: {
        id,
        from: MessageAuthor.Peer,
        name,
        size,
        mime,
        url: null,
        transferred: 0,
        status: FileStatus.Transferring,
        ...(note ? { note } : {}),
        ...(packed ? { packed } : {}),
        ...(replyTo === undefined ? {} : { replyTo }),
        // They stop sending it again after RESEND_MS: a longer wait counts as sent now (see receivePeerText).
        ...(waited && waited <= RESEND_MS ? { at: Date.now() - waited } : {}),
      },
    }));
    dispatch(countUnread(key));

    return true;
  };

  channel.onmessage = (e: MessageEvent) => {
    if (ignoring) {
      return;
    }

    if (!meta) {
      if (!start(e.data) || !meta) {
        return;
      }

      if (refuseIfTooBig(meta)) {
        return;
      }

      if (wireSize(meta) === 0) {
        void finish(meta);
      }

      return;
    }

    if (!(e.data instanceof ArrayBuffer) || done || deleted || error || refuseIfTooBig(meta)) {
      return;
    }

    chunks.push(e.data);
    received += e.data.byteLength;

    if (received >= wireSize(meta)) {
      void finish(meta);
    } else if (received - reported >= wireSize(meta) * PROGRESS_STEP) {
      reported = received;
      dispatch(fileProgress({ key, id, transferred: received }));
    }
  };

  channel.onclose = () => {
    // Only our own entry: a refused copy has the id of another file, and a deleted or replaced one has none.
    const mine = fileTransfers.get(memoryFileKey(key, id)) === stop;

    if (mine) {
      fileTransfers.delete(memoryFileKey(key, id));
    }

    if (mine && meta && !done) {
      dispatch(fileFailed({ key, id, error }));
    }
  };
};
