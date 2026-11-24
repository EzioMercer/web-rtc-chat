// Turns a backup the page writes piece by piece into a download that goes straight to disk, so a big backup never
// has to fit in memory. It handles nothing else: every other request goes to the network as usual, nothing is
// cached. The page sends a MessagePort per download (see src/core/backup/openStreamDownload.ts), then opens
// backup-download/<id> in a hidden frame; this answers with a stream fed from that port, one piece per pull.
const downloads = new Map();

// A download that is never opened is forgotten after this long.
const UNUSED_MS = 60_000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const { id, name } = event.data ?? {};
  const port = event.ports[0];

  if (typeof id !== 'string' || typeof name !== 'string' || !port) {
    return;
  }

  downloads.set(id, { name, port });
  setTimeout(() => downloads.delete(id), UNUSED_MS);
  port.postMessage({ ready: true });
});

self.addEventListener('fetch', (event) => {
  const match = new URL(event.request.url).pathname.match(/\/backup-download\/([\w-]+)$/);
  const download = match && downloads.get(match[1]);

  if (!download) {
    return;
  }

  downloads.delete(match[1]);

  const { name, port } = download;
  const stream = new ReadableStream({
    start: (controller) => {
      port.onmessage = ({ data }) => {
        if (data === 'end') {
          controller.close();
        } else if (data === 'abort') {
          controller.error(new Error('Backup stopped'));
        } else {
          controller.enqueue(new Uint8Array(data));
        }
      };
    },
    pull: () => port.postMessage({ pull: true }),
    cancel: () => port.postMessage({ cancelled: true }),
  }, { highWaterMark: 4 });

  event.respondWith(new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name.replace(/[^\w.-]/g, '_')}"`,
      'Cache-Control': 'no-store',
    },
  }));
});
