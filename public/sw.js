// The app's service worker. Two jobs:
// - Keeps the app's own files (code, styles, icons: never chats or anything else) so the app opens fast and offline.
//   The page is always asked from the site first, so a new version arrives on the next open; the other files have
//   their contents' hash in their name, so a kept one never goes stale. Each build writes its file list into FILES.
// - Turns a backup the page writes piece by piece into a download that goes straight to disk, so a big backup never
//   has to fit in memory. The page sends a MessagePort per download (see src/core/backup/openStreamDownload.ts),
//   then opens backup-download/<id> in a hidden frame; this answers with a stream fed from that port, one piece per
//   pull.

// The app's files, relative to this worker, and the build they belong to. Written by the build (see
// vite.config.ts); null in the dev server, where nothing is kept.
const FILES = null;
const VERSION = 'dev';

const CACHE = `app-${VERSION}`;
// Where the page is kept: the app's address itself.
const PAGE = new URL('./', self.location.href).href;
const BASE_PATH = new URL('./', self.location.href).pathname;
// How long to wait for the site before opening the kept page instead (a very slow network).
const PAGE_WAIT_MS = 4000;

const downloads = new Map();

// A download that is never opened is forgotten after this long.
const UNUSED_MS = 60_000;

// Keeps this build's files: those an older build kept already are copied over, the rest are downloaded. With
// `dropOld` (only when this worker takes over, never from an older worker still finishing a request, which would
// delete the newer copy while it is being made), older builds' files are then deleted: only once this one has all
// of its own, so the app always has a complete set to open offline.
const keepFiles = async (dropOld) => {
  const cache = await caches.open(CACHE);
  const urls = [PAGE, ...FILES.map(file => new URL(file, self.location.href).href)];

  for (const url of urls) {
    if (await cache.match(url)) {
      continue;
    }

    const kept = url === PAGE ? null : await caches.match(url);
    const response = kept ?? await fetch(url, { cache: url === PAGE ? 'no-cache' : 'default' });

    if (!response.ok) {
      throw new Error(`${url}: ${response.status}`);
    }

    await cache.put(url, response);
  }

  for (const name of dropOld ? await caches.keys() : []) {
    if (name.startsWith('app-') && name !== CACHE) {
      await caches.delete(name);
    }
  }
};

// The page: from the site when it answers (a new version arrives this way), else the kept one.
const page = async () => {
  const cache = await caches.open(CACHE);
  const fromSite = fetch(PAGE, { cache: 'no-cache', credentials: 'same-origin' }).then(async (response) => {
    if (response.ok) {
      await cache.put(PAGE, response.clone());
    }

    return response;
  });
  const kept = await caches.match(PAGE);

  if (!kept) {
    return fromSite;
  }

  const slow = new Promise(resolve => setTimeout(() => resolve(kept), PAGE_WAIT_MS));

  return Promise.race([fromSite.catch(() => kept), slow]);
};

// Any other file of the app: the kept copy, else from the site (and kept from now on).
const appFile = async (request) => {
  const kept = await caches.match(request.url);

  if (kept) {
    return kept;
  }

  const response = await fetch(request);

  if (response.ok) {
    await (await caches.open(CACHE)).put(request.url, response.clone());
  }

  return response;
};

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());

  // A failure (offline) is finished on the next open; the old copies then stay until the next version.
  if (FILES) {
    event.waitUntil(keepFiles(true).catch(() => undefined));
  }
});

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

// The app's own files, and nothing else: other requests (the version check, relays, TURN) go to the network as
// usual, untouched.
const isAppFile = (request) => {
  const url = new URL(request.url);

  return request.method === 'GET'
    && url.origin === self.location.origin
    && url.pathname.startsWith(BASE_PATH)
    && (request.mode === 'navigate'
      || url.pathname.startsWith(`${BASE_PATH}assets/`)
      || FILES.some(file => new URL(file, self.location.href).pathname === url.pathname));
};

self.addEventListener('fetch', (event) => {
  const match = new URL(event.request.url).pathname.match(/\/backup-download\/([\w-]+)$/);
  const download = match && downloads.get(match[1]);

  if (!download) {
    if (FILES && isAppFile(event.request)) {
      event.respondWith(event.request.mode === 'navigate' ? page() : appFile(event.request));
    }

    // Each open makes sure every file is kept (quick when they are): a first try that failed offline is finished.
    if (FILES && event.request.mode === 'navigate') {
      event.waitUntil(keepFiles(false).catch(() => undefined));
    }

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
