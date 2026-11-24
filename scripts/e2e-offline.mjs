// The service worker's offline copy of the app, as GitHub Pages serves it. Builds two versions of the app, serves
// them the way GitHub Pages does (every file cached by the browser for 10 minutes, then asked again with its ETag),
// and records every request that reaches the server. Then, in Chromium, Firefox and WebKit: the first visit, a
// reload, offline, a new version (one reload gets it; unchanged files aren't downloaded again; the old copy is
// deleted), and in Chromium a full reload and DevTools' "Disable cache". Needs nothing running:
//   node scripts/e2e-offline.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

const BASE = '/web-rtc-chat/';
const PORT = 4174;
const APP_URL = `http://127.0.0.1:${PORT}${BASE}`;
const failures = [];

const log = message => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const check = (ok, what) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${what}`);

  if (!ok) {
    failures.push(what);
  }
};

const waitFor = async (seconds, test) => {
  for (let i = 0; i < seconds * 4; i += 1) {
    if (await test()) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  return false;
};

// Two builds that differ only in their version, as two pushes would.
const dir = mkdtempSync(join(tmpdir(), 'offline-'));
const builds = {};

for (const version of ['v1', 'v2']) {
  builds[version] = join(dir, version);
  execFileSync('npx', ['vite', 'build', '--outDir', builds[version], '--emptyOutDir'], {
    env: { ...process.env, GITHUB_SHA: `test-${version}` },
    stdio: 'ignore',
  });
}

// Like GitHub Pages: max-age=600 and an ETag on everything, 304 when the ETag still fits.
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};
let served = builds.v1;
let requests = [];
// The site can't be reached: every connection is dropped.
let down = false;

const server = createServer((request, response) => {
  if (down) {
    request.socket.destroy();

    return;
  }

  const path = decodeURIComponent(new URL(request.url, APP_URL).pathname);
  const inSite = path.slice(BASE.length);
  const file = normalize(join(served, path.endsWith('/') ? `${inSite}index.html` : inSite));

  try {
    if (!path.startsWith(BASE) || !file.startsWith(served) || statSync(file).isDirectory()) {
      throw new Error('not found');
    }

    const body = readFileSync(file);
    const etag = `"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`;
    const fresh = request.headers['if-none-match'] === etag;

    requests.push({ path: inSite || '(page)', status: fresh ? 304 : 200, bytes: fresh ? 0 : body.length });
    response.writeHead(fresh ? 304 : 200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'max-age=600',
      'ETag': etag,
    });
    response.end(fresh ? undefined : body);
  } catch {
    requests.push({ path, status: 404, bytes: 0 });
    response.writeHead(404);
    response.end();
  }
});

await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));

// What reached the server since the last call, as "file 200 12.3 KB" lines.
const network = () => {
  const list = requests;

  requests = [];

  return list;
};

const describe = list => (list.length
  ? list.map(r => `${r.path} ${r.status}${r.bytes ? ` ${(r.bytes / 1024).toFixed(1)} KB` : ''}`).join(', ')
  : 'nothing');

// The files a build's worker keeps (besides the page).
const keptFiles = version => JSON.parse(readFileSync(join(builds[version], 'sw.js'), 'utf8')
  .match(/const FILES = (\[.*\]);/)[1]);

const keptCount = version => keptFiles(version).length + 1;

// Offline: the browser's own offline switch (Playwright's breaks WebKit's reload, so WebKit only gets the next one),
// and the site unreachable.
const setOffline = async (context, type, offline) => {
  down = offline;

  if (type !== webkit) {
    await context.setOffline(offline);
  }
};

const assetOf = (version, prefix) => readFileSync(join(builds[version], 'index.html'), 'utf8')
  .match(new RegExp(`assets/${prefix}-[^"]+\\.js`))?.[0];

// The version the open page runs, and whether the worker controls it.
const state = page => page.evaluate(() => ({
  script: document.querySelector('script[type=module][src*="assets/index-"]')?.getAttribute('src') ?? '',
  controlled: Boolean(navigator.serviceWorker?.controller),
}));

// The worker's copies: cache names and how many files each holds.
const kept = page => page.evaluate(async () => Promise.all((await caches.keys()).map(async name => (
  { name, files: (await (await caches.open(name)).keys()).length }
))));

const appShows = page => page.getByRole('button', { name: 'Settings' }).isVisible().catch(() => false);

const run = async (type, name) => {
  log(`--- ${name}`);
  served = builds.v1;
  network();

  const browser = await type.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const v2 = assetOf('v2', 'index');

  // The first visit: the app's start files, then the worker downloads the rest in the background.
  await page.goto(APP_URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Settings' }).waitFor();
  check(
    await waitFor(20, async () => (await kept(page)).some(cache => (
      cache.name === 'app-test-v1' && cache.files === keptCount('v1')
    ))),
    `${name}: the first visit keeps all ${keptCount('v1')} files (${JSON.stringify(await kept(page))})`,
  );
  log(`${name}: first visit asked for: ${describe(network())}`);

  // A reload: only the page (and the worker and version checks) are asked.
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).waitFor();

  const reload = network();

  log(`${name}: reload asked for: ${describe(reload)}`);
  check(reload.every(r => !r.path.startsWith('assets/')), `${name}: a reload asks for no app files`);
  check((await state(page)).controlled, `${name}: the worker serves the page`);

  // Offline: the app opens, and so does Profile info, from the kept files.
  await setOffline(context, type, true);
  await page.reload();
  check(await waitFor(10, () => appShows(page)), `${name}: offline, the app opens`);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Profile info/ }).click();
  check(
    await waitFor(10, () => page.getByLabel('Phone number').isVisible()),
    `${name}: offline, Profile info opens (phone library and flags kept)`,
  );
  await setOffline(context, type, false);
  network();

  // A new version is out: one reload runs it, and unchanged files aren't downloaded again.
  served = builds.v2;
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).waitFor();

  const after = await state(page);

  check(after.script.endsWith(v2), `${name}: one reload runs the new version (${after.script})`);
  await waitFor(20, async () => (await kept(page)).map(cache => cache.name).join() === 'app-test-v2');

  const update = network();

  log(`${name}: new version asked for: ${describe(update)}`);

  // Changed: the main file and those that import from it by name. The libraries keep their names.
  const assets = update.filter(r => r.path.startsWith('assets/') && r.status === 200).map(r => r.path).sort();
  const changed = keptFiles('v2').filter(file => !keptFiles('v1').includes(file)).sort();

  check(
    JSON.stringify(assets) === JSON.stringify(changed),
    `${name}: only changed files are downloaded (${assets.join(', ')})`,
  );
  check(
    ['phone-', 'flags-', 'jsQR-'].every(lib => !assets.some(file => file.includes(lib))),
    `${name}: the phone library, flags and QR scanner aren't downloaded again`,
  );
  check(
    JSON.stringify(await kept(page)) === JSON.stringify([{ name: 'app-test-v2', files: keptCount('v2') }]),
    `${name}: the old version's copy is deleted (${JSON.stringify(await kept(page))})`,
  );

  await setOffline(context, type, true);
  await page.reload();
  check(
    await waitFor(10, () => appShows(page)) && (await state(page)).script.endsWith(v2),
    `${name}: offline after the update, the new version opens`,
  );
  await setOffline(context, type, false);
  network();

  if (type === chromium) {
    const cdp = await context.newCDPSession(page);

    // A full reload (Ctrl+Shift+R) skips the worker and the browser's cache: everything comes from the site.
    await cdp.send('Page.reload', { ignoreCache: true });
    await page.waitForLoadState('load');
    await page.getByRole('button', { name: 'Settings' }).waitFor();

    const full = network();

    log(`${name}: full reload asked for: ${describe(full)}`);
    check(!(await state(page)).controlled, `${name}: a full reload isn't served by the worker`);

    // The next ordinary reload is the worker's again.
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).waitFor();
    check((await state(page)).controlled, `${name}: the next reload is the worker's again`);
    log(`${name}: reload after it asked for: ${describe(network())}`);

    // DevTools' "Disable cache" turns off the browser's cache only: the worker still serves the files.
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).waitFor();

    const disabled = network();

    log(`${name}: reload with "Disable cache" asked for: ${describe(disabled)}`);
    check(disabled.every(r => !r.path.startsWith('assets/')), `${name}: with "Disable cache", no app files are asked`);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  }

  await browser.close();
};

try {
  for (const [type, name] of [[chromium, 'Chromium'], [firefox, 'Firefox'], [webkit, 'WebKit']]) {
    await run(type, name);
  }
} finally {
  server.close();
  rmSync(dir, { recursive: true, force: true });
}

log(failures.length ? `${failures.length} failed:\n  ${failures.join('\n  ')}` : 'All passed.');
process.exit(failures.length ? 1 : 0);
