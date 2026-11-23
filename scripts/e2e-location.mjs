// Two browsers connect by hand-copied codes (no relays) and share locations: a one-time one, then a live one that
// moves and is stopped (Chromium with Chromium and with WebKit). Then, in each engine (Chromium, Firefox, WebKit)
// and as an iPhone and an Android phone, every kind of location bubble and both share windows are drawn, and tapping
// a place opens it the device's way; with screenshots if a folder is given. (Firefox can't connect to another
// browser in the cloud container, so it is only drawn.)
// It reaches into the app's modules, which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-location.mjs [shots folder]
import { mkdirSync } from 'node:fs';
import { chromium, devices, firefox, webkit } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
const SHOTS = process.argv[2] ?? null;
const failures = [];

const log = message => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const check = (ok, what) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${what}`);

  if (!ok) {
    failures.push(what);
  }
};

const BAKU = { latitude: 40.4093, longitude: 49.8671, accuracy: 12 };

// `device`: a viewport, or one of Playwright's phones.
const user = async (engine, name, device) => {
  // Browsers hide local addresses behind .local names, which can't be looked up in the cloud container.
  const browser = await engine.launch(engine === chromium
    ? { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] }
    : { firefoxUserPrefs: { 'media.peerconnection.ice.obfuscate_host_addresses': false } });
  const context = await browser.newContext({
    ...(device.width ? { viewport: device } : device),
    geolocation: BAKU,
    permissions: ['geolocation'],
  });

  // Safari on an iPhone or Mac can share; WebKit on Linux can't, so the Share item is shown as it would be there.
  await context.addInitScript(() => {
    if (/iPhone|Macintosh/.test(navigator.userAgent) && !navigator.share) {
      navigator.share = async () => undefined;
    }
  });
  // Maps links are answered here, not sent out.
  await context.route(/google\.com|apple\.com/, route => route.fulfill({ body: 'maps' }));

  const page = await context.newPage();

  page.on('pageerror', err => log(`[${name} error] ${err.message}`));
  await page.goto(URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Connect manually' }).click();

  return { browser, context, page };
};

const connect = async (a, b) => {
  const code = page => page.waitForFunction(() => document.querySelectorAll('textarea')[1]?.value.length > 10)
    .then(() => page.locator('textarea').nth(1).inputValue());

  await a.getByRole('button', { name: 'Host' }).click();
  await b.locator('textarea').first().fill(await code(a));
  await b.getByRole('button', { name: 'Join' }).click();
  await a.locator('textarea').first().fill(await code(b));
  await a.getByRole('button', { name: 'Connect', exact: true }).click();
  await a.getByText('Connected. Say hi!').waitFor({ timeout: 30000 });
  await b.getByText('Connected. Say hi!').waitFor({ timeout: 30000 });
};

// The location messages in the page's store.
const locations = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { MANUAL_KEY } = await import('/web-rtc-chat/src/core/webrtc/config.ts');

  return (store.getState().chat.conversations[MANUAL_KEY] ?? []).filter(m => m.kind === 2);
});

const waitFor = async (test, ms = 15000) => {
  const end = Date.now() + ms;

  while (Date.now() < end) {
    if (await test()) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  return false;
};

const share = async (page, item, button, duration) => {
  await page.getByRole('button', { name: 'Attach' }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();

  if (duration) {
    await page.getByRole('radio', { name: duration }).click();
  }

  await page.getByRole('button', { name: button }).click();
};

const shot = async (page, name) => {
  if (SHOTS) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  }
};

// Every kind of bubble, put straight into the manual chat (marked connected, so the paper clip works).
const SAMPLES = `
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { MANUAL_KEY } = await import('/web-rtc-chat/src/core/webrtc/config.ts');
  const chat = await import('/web-rtc-chat/src/store/chat/chatSlice.ts');
  const manual = await import('/web-rtc-chat/src/store/manual/manualSlice.ts');
  const now = Date.now();
  const place = { lat: 40.4093, lng: 49.8671, accuracy: 12 };
  const add = message => store.dispatch(chat.locationAdded({
    key: MANUAL_KEY,
    message: { kind: 2, ...place, ...message },
  }));

  store.dispatch(manual.connected([]));
  store.dispatch(chat.addMessage({ key: MANUAL_KEY, from: 'peer', text: 'Where are you?' }));
  add({ id: 'p.there', from: 'peer', at: now - 600000, lat: 40.3777, lng: 49.892, accuracy: 35 });
  add({ id: 'once', from: 'me', at: now - 500000 });
  add({ id: 'p.ended', from: 'peer', at: now - 4000000, liveUntil: now - 3100000, updatedAt: now - 3100000, rev: 9 });
  add({ id: 'p.live', from: 'peer', at: now - 900000, liveUntil: now + 1500000, updatedAt: now - 20000, rev: 3,
    lat: 40.39, lng: 49.85 });
  add({ id: 'live', from: 'me', at: now - 300000, liveUntil: now + 600000, updatedAt: now - 5000, rev: 2 });
`;

// Opens their one-time place with a tap; the URL of the tab it opened, or null if none opened.
const tapPlace = async (a) => {
  const opened = a.context.waitForEvent('page', { timeout: 3000 }).catch(() => null);

  await a.page.getByRole('link', { name: 'Open in a maps app' }).first().click();

  const tab = await opened;

  if (!tab) {
    return null;
  }

  await tab.waitForLoadState().catch(() => undefined);

  const url = tab.url();

  await tab.close();

  return url;
};

const drawn = async (label, engine, device) => {
  log(`--- ${label}`);

  const a = await user(engine, 'A', device);
  const viewport = a.page.viewportSize();

  try {
    await a.page.evaluate(`(async () => {${SAMPLES}})()`);
    await a.page.waitForTimeout(300);
    check(await a.page.getByText('ENDED', { exact: true }).isVisible(), `${label}: ended live location`);
    check(await a.page.getByRole('button', { name: 'Stop sharing' }).isVisible(), `${label}: ours can be stopped`);
    check(await a.page.getByText('LIVE', { exact: true }).count() === 2, `${label}: two running live badges`);

    const overflow = await a.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

    check(!overflow, `${label}: nothing wider than the screen`);
    // Tall enough to show them all.
    await a.page.setViewportSize({ ...viewport, height: 1900 });
    await shot(a.page, `${label}-bubbles`);
    await a.page.setViewportSize(viewport);

    // A long tap or right click offers the browser's "Copy link": a Google Maps link anyone can open.
    const href = await a.page.getByRole('link', { name: 'Open in a maps app' }).first().getAttribute('href');

    check(href === 'https://www.google.com/maps/search/?api=1&query=40.377700,49.892000', `${label}: link to copy`);

    const agent = await a.page.evaluate(() => navigator.userAgent);

    if (/Android/.test(agent)) {
      // Android's own list of apps opens (geo:); our page stays, with no list of ours.
      check(await tapPlace(a) === null, `${label}: Android picks the app`);
      check(await a.page.getByText('Open with').count() === 0, `${label}: no list of ours on Android`);
    } else if (/iPhone|Macintosh/.test(agent)) {
      // Asked every time: Apple Maps, Google Maps or Share….
      check(await tapPlace(a) === null, `${label}: Apple device asks`);
      await a.page.getByText('Open with').waitFor();
      check(await a.page.getByRole('button', { name: 'Share…' }).isVisible(), `${label}: Share… offered`);
      await shot(a.page, `${label}-open-with`);

      const opened = a.context.waitForEvent('page');

      await a.page.getByRole('link', { name: 'Apple Maps' }).click();

      const tab = await opened;

      check(tab.url().startsWith('https://maps.apple.com/?ll=40.377700,49.892000'), `${label}: opens Apple Maps`);
      await tab.close();
      check(await tapPlace(a) === null && await a.page.getByText('Open with').isVisible(), `${label}: asks again`);
      await a.page.keyboard.press('Escape');
    } else {
      // Other computers: Google Maps in a new tab.
      check((await tapPlace(a))?.startsWith('https://www.google.com/maps/') === true, `${label}: opens Google Maps`);
    }

    await a.page.getByRole('button', { name: 'Attach' }).click();
    await shot(a.page, `${label}-menu`);
    await a.page.getByRole('menuitem', { name: 'Location', exact: true }).click();
    await a.page.getByText('Accurate to').waitFor({ timeout: 15000 });
    check(true, `${label}: share window finds the place`);
    await shot(a.page, `${label}-dialog-once`);
    await a.page.keyboard.press('Escape');
    await a.page.getByRole('button', { name: 'Attach' }).click();
    await a.page.getByRole('menuitem', { name: 'Live location', exact: true }).click();
    await a.page.getByText('Accurate to').waitFor({ timeout: 15000 });
    await shot(a.page, `${label}-dialog-live`);
  } finally {
    await a.browser.close();
  }
};

const pair = async (label, engineA, engineB, viewport) => {
  log(`--- ${label}`);

  const a = await user(engineA, 'A', viewport);
  const b = await user(engineB, 'B', viewport);

  try {
    await connect(a.page, b.page);

    // A one-time location.
    await share(a.page, 'Location', 'Send this location');
    check(await waitFor(async () => (await locations(b.page)).length === 1), `${label}: location arrives`);

    const [once] = await locations(b.page);

    check(Math.abs(once.lat - BAKU.latitude) < 1e-6 && once.liveUntil === undefined, `${label}: one-time place`);
    check(await waitFor(async () => !(await locations(a.page))[0]?.pending), `${label}: confirmed`);

    // A live one, from B this time, which then moves about 300 m north.
    await share(b.page, 'Live location', 'Share live location', '15 min');
    check(await waitFor(async () => (await locations(a.page)).length === 2), `${label}: live arrives`);

    const [, live] = await locations(a.page);

    const left = live.liveUntil - Date.now();

    check(left > 14 * 60_000 && left <= 15 * 60_000, `${label}: 15 min left`);

    // Both sides draw the same streets.
    const streets = page => page.locator('svg rect').last().getAttribute('x');

    check(await streets(a.page) === await streets(b.page), `${label}: same drawing on both sides`);
    await b.context.setGeolocation({ ...BAKU, latitude: BAKU.latitude + 0.003 });
    check(
      await waitFor(async () => Math.abs((await locations(a.page))[1].lat - (BAKU.latitude + 0.003)) < 1e-6),
      `${label}: live location moves`,
    );
    await shot(a.page, `${label}-chat-receiver`);
    await shot(b.page, `${label}-chat-sender`);

    // B stops it.
    await b.page.getByRole('button', { name: 'Stop sharing' }).click();
    check(await waitFor(async () => (await locations(a.page))[1].liveUntil <= Date.now()), `${label}: stop arrives`);

    const ended = () => a.page.getByText('ENDED', { exact: true }).isVisible();

    check(await waitFor(ended, 3000), `${label}: shown as ended`);
    await shot(a.page, `${label}-chat-ended`);
  } finally {
    await a.browser.close();
    await b.browser.close();
  }
};

if (SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
}

const PHONE = { width: 390, height: 780 };
const DESKTOP = { width: 1280, height: 800 };

await pair('chromium-chromium', chromium, chromium, PHONE);
await pair('webkit-chromium', webkit, chromium, PHONE);
await pair('chromium-webkit', chromium, webkit, DESKTOP);

await drawn('iphone', webkit, devices['iPhone 13']);
await drawn('android', chromium, devices['Pixel 7']);
await drawn('firefox-phone', firefox, PHONE);
await drawn('chromium-desktop', chromium, DESKTOP);
await drawn('firefox-desktop', firefox, DESKTOP);
await drawn('mac-desktop', webkit, DESKTOP);

log(failures.length ? `${failures.length} FAILED:\n${failures.join('\n')}` : 'All passed');
process.exit(failures.length ? 1 : 0);
