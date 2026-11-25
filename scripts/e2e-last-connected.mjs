// "Last connected" under a contact's name. First, in a page with a set time zone: the words for every distance
// (the time today, yesterday, exact days, weeks, calendar months of 28 to 31 days, years, a clock change, a time
// ahead of ours) and the backup check of the field. Then two browsers connected by hand-copied codes (the manual
// connection stands in for a contact, as in e2e-unread): "online" while connected, the connection log button's icon
// and label for a direct and a relay connection, no "verified" in the header, the time renewed while connected,
// set when the connection closes, kept after a reload, and the header for older times. Chromium with Chromium, then
// Chromium with WebKit. It reaches into the app's modules, which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-last-connected.mjs [screenshot folder]
import { mkdirSync } from 'node:fs';
import { chromium, webkit } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
const SHOTS = process.argv[2];
const failures = [];

const log = message => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const check = (ok, what) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${what}`);

  if (!ok) {
    failures.push(what);
  }
};

const waitFor = async (what, seconds, test) => {
  for (let i = 0; i < seconds * 4; i += 1) {
    if (await test()) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  log(`timed out: ${what}`);

  return false;
};

const createIdentity = async (page) => {
  await page.goto(URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Settings' }).waitFor();
};

const user = async (type, name, options = {}) => {
  // Chromium hides its addresses behind names WebKit can't look up.
  const browser = await type.launch(type === chromium
    ? { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] }
    : {});
  const context = await browser.newContext({
    viewport: { width: 1000, height: 700 },
    locale: 'en-GB',
    // Sharp screenshots for people to look at.
    deviceScaleFactor: SHOTS ? 2 : 1,
    ...options,
  });
  const page = await context.newPage();

  page.on('pageerror', err => log(`[${name} error] ${err.message}`));

  return { browser, context, page };
};

const connect = async (a, b) => {
  const code = page => page.waitForFunction(() => document.querySelectorAll('textarea')[1]?.value.length > 10)
    .then(() => page.locator('textarea').nth(1).inputValue());

  for (const page of [a, b]) {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Connect manually' }).click();
  }

  await a.getByRole('button', { name: 'Host' }).click();
  await b.locator('textarea').first().fill(await code(a));
  await b.getByRole('button', { name: 'Join' }).click();
  await a.locator('textarea').first().fill(await code(b));
  await a.getByRole('button', { name: 'Connect', exact: true }).click();
  await a.getByText('Connected. Say hi!').last().waitFor({ timeout: 30000 });
  await b.getByText('Connected. Say hi!').last().waitFor({ timeout: 30000 });
};

// A verified contact, and the manual connection moved under its id, so the chat pane shows it and its time is noted
// like a contact's. Shown as connected, so opening it doesn't try the relays.
const pretendContact = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { contactAdded } = await import('/web-rtc-chat/src/store/contacts/contactsSlice.ts');
  const { sessionStatusChanged } = await import('/web-rtc-chat/src/store/sessions/sessionsSlice.ts');
  const { SessionStatus } = await import('/web-rtc-chat/src/store/sessions/types.ts');
  const { newContactKey } = await import('/web-rtc-chat/src/core/identity/newContactKey.ts');
  const { contactKeys } = await import('/web-rtc-chat/src/core/identity/contactKeys.ts');
  const { sessions } = await import('/web-rtc-chat/src/core/webrtc/state.ts');
  const key = await newContactKey();
  const session = sessions.get('manual');

  sessions.delete('manual');
  session.key = 'peer';
  sessions.set('peer', session);
  contactKeys.set('peer', key);
  store.dispatch(contactAdded({
    id: 'peer',
    name: 'Peer',
    favourite: false,
    verified: true,
    safety: 'test',
    identity: 'x',
    myKey: key.publicKey,
    secrets: ['s'.repeat(43)],
    sendSecret: 's'.repeat(43),
    lastConnected: null,
  }));
  store.dispatch(sessionStatusChanged({ key: 'peer', status: SessionStatus.Connected }));
});

const lastConnected = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');

  return store.getState().contacts.list.find(c => c.id === 'peer')?.lastConnected;
});

const setStatus = (page, name) => page.evaluate(async (n) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { sessionStatusChanged } = await import('/web-rtc-chat/src/store/sessions/sessionsSlice.ts');
  const { SessionStatus } = await import('/web-rtc-chat/src/store/sessions/types.ts');

  store.dispatch(sessionStatusChanged({ key: 'peer', status: SessionStatus[n] }));
}, name);

const setRoute = (page, name) => page.evaluate(async (n) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { sessionRouteChanged } = await import('/web-rtc-chat/src/store/sessions/sessionsSlice.ts');
  const { SessionRoute } = await import('/web-rtc-chat/src/store/sessions/types.ts');

  store.dispatch(sessionRouteChanged({ key: 'peer', route: SessionRoute[n] }));
}, name);

const seen = (page, at) => page.evaluate(async (t) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { contactSeen } = await import('/web-rtc-chat/src/store/contacts/contactsSlice.ts');

  store.dispatch(contactSeen({ id: 'peer', at: t }));
}, at);

const select = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { selectConversation } = await import('/web-rtc-chat/src/store/thunks/chat/selectConversation.ts');

  store.dispatch(selectConversation('peer'));
});

const header = page => page.locator('[class*="header"]').filter({ has: page.getByText('Peer', { exact: true }) })
  .first();

const subtitle = page => header(page).locator('[class*="subtitle"]').innerText();

const shot = async (page, name) => {
  if (SHOTS) {
    await header(page).screenshot({ path: `${SHOTS}/${name}.png` });
  }
};

// The header and the bar under it.
const shotWithBar = async (page, name) => {
  if (SHOTS) {
    const top = await header(page).boundingBox();
    const bar = await page.locator('[class*="offline"]').boundingBox();

    await page.screenshot({
      path: `${SHOTS}/${name}.png`,
      clip: { x: top.x, y: top.y, width: top.width, height: bar.y + bar.height - top.y },
    });
  }
};

// The words for each distance, in Berlin's time zone (a clock change on 29 March 2026).
const words = async () => {
  log('--- words');

  const { browser, page } = await user(chromium, 'W', { timezoneId: 'Europe/Berlin' });

  await page.goto(URL);

  const results = await page.evaluate(async () => {
    const { formatLastConnected } = await import('/web-rtc-chat/src/utils/formatLastConnected.ts');
    const { startOfDay } = await import('/web-rtc-chat/src/utils/startOfDay.ts');
    const { validContact } = await import('/web-rtc-chat/src/core/backup/validContact.ts');

    const day = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

    const say = (at, today) => formatLastConnected(at, startOfDay(today));

    const contact = {
      id: 'a',
      name: 'A',
      favourite: false,
      verified: false,
      safety: 's',
      identity: 'i',
      myKey: 'k',
      secrets: [],
      sendSecret: 's',
    };

    return {
      cases: [
        [say(day(2026, 11, 25, 20, 13), day(2026, 11, 25, 23)), 'last connected at 20:13'],
        [say(day(2026, 11, 25, 0, 0), day(2026, 11, 25, 23, 59)), 'last connected at 0:00'],
        [say(day(2026, 11, 24, 23, 59), day(2026, 11, 25, 0, 1)), 'last connected yesterday'],
        [say(day(2026, 11, 23), day(2026, 11, 25)), 'last connected 2 days ago'],
        [say(day(2026, 11, 20), day(2026, 11, 25)), 'last connected 5 days ago'],
        [say(day(2026, 11, 19), day(2026, 11, 25)), 'last connected 6 days ago'],
        [say(day(2026, 11, 18), day(2026, 11, 25)), 'last connected 1 week ago'],
        [say(day(2026, 11, 12), day(2026, 11, 25)), 'last connected 1 week ago'],
        [say(day(2026, 11, 11), day(2026, 11, 25)), 'last connected 2 weeks ago'],
        [say(day(2026, 1, 31), day(2026, 2, 27)), 'last connected 3 weeks ago'],
        [say(day(2026, 1, 31), day(2026, 2, 28)), 'last connected 1 month ago'],
        [say(day(2026, 3, 31), day(2026, 4, 29)), 'last connected 4 weeks ago'],
        [say(day(2026, 3, 31), day(2026, 4, 30)), 'last connected 1 month ago'],
        [say(day(2026, 10, 30), day(2026, 11, 27)), 'last connected 4 weeks ago'],
        [say(day(2026, 1, 15), day(2026, 12, 14)), 'last connected 10 months ago'],
        [say(day(2026, 1, 15), day(2026, 12, 15)), 'last connected 11 months ago'],
        [say(day(2025, 12, 15), day(2026, 12, 14)), 'last connected 11 months ago'],
        [say(day(2025, 12, 15), day(2026, 12, 15)), 'last connected 1 year ago'],
        [say(day(2024, 2, 29), day(2025, 2, 27)), 'last connected 11 months ago'],
        [say(day(2024, 2, 29), day(2025, 2, 28)), 'last connected 1 year ago'],
        [say(day(2022, 11, 26), day(2026, 11, 25)), 'last connected 3 years ago'],
        // Across the clock change: still whole days.
        [say(day(2026, 3, 28, 23, 30), day(2026, 3, 30, 0, 30)), 'last connected 2 days ago'],
        [say(day(2026, 3, 28, 23, 30), day(2026, 3, 29, 0, 30)), 'last connected yesterday'],
        // A saved time ahead of the clock now (the device's clock was moved back).
        [say(day(2026, 11, 26, 9, 5), day(2026, 11, 25, 20)), 'last connected at 9:05'],
      ],
      backups: [
        validContact({ ...contact, lastConnected: null }),
        validContact({ ...contact, lastConnected: 1764000000000 }),
        !validContact(contact),
        !validContact({ ...contact, lastConnected: -1 }),
        !validContact({ ...contact, lastConnected: '1764000000000' }),
        !validContact({ ...contact, lastConnected: 1.5 }),
      ],
    };
  });

  results.cases.forEach(([got, want]) => check(got === want, `"${want}"${got === want ? '' : ` (got "${got}")`}`));
  check(results.backups.every(Boolean), `a backup's contact needs a valid lastConnected (${results.backups})`);
  await browser.close();
};

const flow = async (type, name) => {
  log(`--- Chromium with ${name}`);

  const a = await user(chromium, 'A');
  const b = await user(type, 'B');

  await createIdentity(a.page);
  await createIdentity(b.page);
  await connect(a.page, b.page);
  await pretendContact(a.page);
  await select(a.page);
  await header(a.page).waitFor();

  check(await subtitle(a.page) === 'online', `connected: "online" (got "${await subtitle(a.page)}")`);
  check(!(await header(a.page).innerText()).includes('verified'), 'no "verified" in the header (the shield shows it)');

  const direct = a.page.getByRole('button', { name: 'Connection log (direct connection)' });

  check(await direct.count() === 1, 'the log button says "direct connection"');
  await shot(a.page, `${name}-online-direct`);

  await setRoute(a.page, 'Relay');

  const relay = a.page.getByRole('button', { name: 'Connection log (through TURN relay)' });

  check(await relay.count() === 1, 'the log button says "through TURN relay"');

  const iconOf = locator => locator.locator('path').first().getAttribute('d');

  check(await iconOf(relay) !== await iconOf(a.page.getByRole('button', { name: 'Safety code' })), 'relay icon shown');
  await shot(a.page, `${name}-online-relay`);
  await setRoute(a.page, 'Direct');

  // While connected the time is renewed (the path check runs once a minute).
  const old = Date.now() - 10 * 60_000;

  await seen(a.page, old);

  const fresh = async () => (await lastConnected(a.page)) > Date.now() - 90_000;

  check(await waitFor('renewed while connected', 75, fresh), 'a 10 minute old time is renewed while connected');

  const renewed = await lastConnected(a.page);

  // The other side goes away: the time is when the connection closed.
  await b.browser.close();

  const later = async () => (await lastConnected(a.page)) > renewed;

  check(await waitFor('time set on close', 60, later), 'the time is set when the connection closes');

  const closed = await lastConnected(a.page);
  const clock = new Date(closed).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });

  await setStatus(a.page, 'Offline');

  const text = await subtitle(a.page);

  check(text === `last connected at ${clock}`, `"last connected at ${clock}" (got "${text}")`);

  const plain = a.page.getByRole('button', { name: 'Connection log', exact: true });

  check(await plain.count() === 1, 'not connected: the log button names no route');
  await shot(a.page, `${name}-today`);

  // While connecting, the header keeps the time and the bar below says what is happening.
  await setStatus(a.page, 'Connecting');

  const connecting = await subtitle(a.page);

  check(connecting === text, `connecting: the header keeps "${text}" (got "${connecting}")`);
  check(await a.page.locator('[class*="offline"]').count() === 1, 'connecting: the bar below says so');
  await shotWithBar(a.page, `${name}-connecting`);
  await setStatus(a.page, 'Offline');
  await shotWithBar(a.page, `${name}-offline`);

  // Saved: after a reload it is still there.
  await new Promise(resolve => setTimeout(resolve, 1000));
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(await lastConnected(a.page) === closed, 'the time is kept after a reload');

  // Older times, as the header shows them.
  const DAY = 24 * 60 * 60_000;

  await select(a.page);
  await header(a.page).waitFor();

  for (const [label, at, want] of [
    ['yesterday', Date.now() - DAY, 'last connected yesterday'],
    ['days', Date.now() - 4 * DAY, 'last connected 4 days ago'],
    ['weeks', Date.now() - 16 * DAY, 'last connected 2 weeks ago'],
    ['months', Date.now() - 100 * DAY, 'last connected 3 months ago'],
    ['years', Date.now() - 800 * DAY, 'last connected 2 years ago'],
  ]) {
    await seen(a.page, at);
    await setStatus(a.page, 'Offline');
    check(await subtitle(a.page) === want, `${want} (got "${await subtitle(a.page)}")`);
    await shot(a.page, `${name}-${label}`);
  }

  await a.browser.close();
};

if (SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
}

await words();
await flow(chromium, 'chromium');
await flow(webkit, 'webkit');

log(failures.length ? `${failures.length} FAILED:\n  ${failures.join('\n  ')}` : 'ALL PASSED');
process.exit(failures.length ? 1 : 0);
