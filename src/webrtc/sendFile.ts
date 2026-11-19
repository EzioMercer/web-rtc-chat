import { FILE_BUFFER_HIGH, FILE_BUFFER_LOW, FILE_CHUNK_SIZE, FILE_DONE, FILE_LABEL } from './config.ts';
import type { FileMeta } from './types.ts';
import { waitForDrain } from './waitForDrain.ts';

// Streams `file` over its own data channel. Resolves once the peer confirms it received everything.
export const sendFile = (
  peer: RTCPeerConnection,
  id: string,
  file: File,
  onProgress: (sent: number) => void,
): Promise<void> => new Promise((resolve, reject) => {
  const channel = peer.createDataChannel(FILE_LABEL, { ordered: true });
  const meta: FileMeta = { id, name: file.name, size: file.size, mime: file.type };
  let confirmed = false;

  channel.binaryType = 'arraybuffer';
  channel.bufferedAmountLowThreshold = FILE_BUFFER_LOW;

  channel.onmessage = (e) => {
    if (e.data === FILE_DONE) {
      confirmed = true;
      resolve();
      channel.close();
    }
  };

  channel.onclose = () => {
    if (!confirmed) {
      reject(new Error('Transfer interrupted'));
    }
  };

  channel.onopen = async () => {
    try {
      channel.send(JSON.stringify(meta));

      for (let offset = 0; offset < file.size; offset += FILE_CHUNK_SIZE) {
        if (channel.bufferedAmount > FILE_BUFFER_HIGH) {
          await waitForDrain(channel);
        }

        channel.send(await file.slice(offset, offset + FILE_CHUNK_SIZE).arrayBuffer());
        onProgress(Math.min(offset + FILE_CHUNK_SIZE, file.size));
      }
    } catch (err) {
      reject(err);
      channel.close();
    }
  };
});
