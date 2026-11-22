import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import type { ByteSink } from './ByteSink.ts';

// How long to wait for the service worker to take the download before building it in memory instead.
const START_MS = 5000;
// The hidden frame stays a while after the end, so the browser can finish saving.
const FRAME_MS = 60_000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => Promise.race([
  promise,
  new Promise<T>((_resolve, reject) => {
    window.setTimeout(() => reject(new Error('Timed out')), ms);
  }),
]);

// A download named `name` that goes to disk piece by piece through the service worker (see backup-sw.js), or null
// if this browser can't do that.
export const openStreamDownload = async (name: string): Promise<ByteSink | null> => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  const worker = await withTimeout(navigator.serviceWorker.ready, START_MS)
    .then(registration => registration.active)
    .catch(() => null);

  if (!worker) {
    return null;
  }

  const id = bytesToB64(randomBytes(16));
  const channel = new MessageChannel();
  const port = channel.port1;
  let credit = 0;
  let cancelled = false;
  let wake: (() => void) | null = null;
  let onReady: (() => void) | null = null;
  let onFirstPull: (() => void) | null = null;

  port.onmessage = ({ data }: MessageEvent<{ ready?: boolean; pull?: boolean; cancelled?: boolean }>) => {
    if (data.ready) {
      onReady?.();
    } else if (data.pull) {
      credit += 1;
      onFirstPull?.();
    } else if (data.cancelled) {
      cancelled = true;
    }

    wake?.();
  };

  worker.postMessage({ id, name }, [channel.port2]);

  const frame = document.createElement('iframe');

  try {
    await withTimeout(new Promise<void>((resolve) => {
      onReady = resolve;
    }), START_MS);

    frame.hidden = true;
    frame.src = `${import.meta.env.BASE_URL}backup-download/${id}`;
    document.body.append(frame);

    await withTimeout(new Promise<void>((resolve) => {
      onFirstPull = resolve;
    }), START_MS);
  } catch {
    frame.remove();
    port.close();

    return null;
  }

  const finish = () => window.setTimeout(() => {
    frame.remove();
    port.close();
  }, FRAME_MS);

  return {
    write: async (bytes) => {
      while (!credit && !cancelled) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
      }

      if (cancelled) {
        throw new Error('The download was cancelled.');
      }

      credit -= 1;
      port.postMessage(bytes.buffer, [bytes.buffer]);
    },
    close: async () => {
      port.postMessage('end');
      finish();
    },
    abort: () => {
      port.postMessage('abort');
      finish();
    },
  };
};
