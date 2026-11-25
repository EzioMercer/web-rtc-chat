// Unread chats and day labels. Two browsers connected by hand-copied codes (the manual connection stands in for a
// contact, as in e2e-delete, so the chat is saved): their messages count while the chat isn't in view, deleting an
// unread one lowers the count, a message that waited is put before ones already read and becomes the first unread
// one, a hidden tab counts and coming back shows the line, the count stays after a reload, opening the chat shows the
// "Unread messages" line above the first unread one (it stays while the chat is open), Mark as unread (a dot, no
// number), Mark as read. Then, in a page of its own with a set clock and time zone: the day labels (Today,
// Yesterday, a weekday, a date, a date with its year), the device's own time zone deciding the day, and Today turning
// into Yesterday at midnight. Chromium with Chromium, then Chromium with WebKit. It reaches into the app's modules,
// which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-unread.mjs [screenshot folder]
import { chromium, webkit } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
const KEY = 'manual';
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

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

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
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 }, locale: 'en-GB', ...options });
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

// A contact with the manual connection's id, so its chat is saved and listed like a contact's. Shown as connected,
// so opening it doesn't try to connect through relays (which would replace the manual connection).
const pretendContact = (page, id = 'manual') => page.evaluate(async (contactId) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { contactAdded } = await import('/web-rtc-chat/src/store/contacts/contactsSlice.ts');
  const { sessionStatusChanged } = await import('/web-rtc-chat/src/store/sessions/sessionsSlice.ts');
  const { SessionStatus } = await import('/web-rtc-chat/src/store/sessions/types.ts');
  const { newContactKey } = await import('/web-rtc-chat/src/core/identity/newContactKey.ts');
  const { contactKeys } = await import('/web-rtc-chat/src/core/identity/contactKeys.ts');
  const key = await newContactKey();

  contactKeys.set(contactId, key);
  store.dispatch(contactAdded({
    id: contactId,
    name: 'Peer',
    favourite: false,
    verified: true,
    safety: 'test',
    identity: 'x',
    myKey: key.publicKey,
    secrets: ['s'.repeat(43)],
    sendSecret: 's'.repeat(43),
  }));
  store.dispatch(sessionStatusChanged({ key: contactId, status: SessionStatus.Connected }));
}, id);

const state = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { chat, ui } = store.getState();

  return { messages: chat.conversations.manual ?? [], unread: chat.unread.manual, line: ui.unreadLine };
});

const count = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { unreadCount } = await import('/web-rtc-chat/src/store/chat/unreadCount.ts');
  const { chat } = store.getState();

  return unreadCount(chat.conversations.manual, chat.unread.manual?.from);
});

const byText = async (page, text) => (await state(page)).messages.find(m => m.text === text);

const sendText = (page, text) => page.evaluate(async (t) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { sendMessage } = await import('/web-rtc-chat/src/store/thunks/chat/sendMessage.ts');

  store.dispatch(sendMessage('manual', t));
}, text);

const dispatchIn = (page, module, name, payload) => page.evaluate(async ({ m, n, p }) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const actions = await import(`/web-rtc-chat/src/${m}`);

  store.dispatch(actions[n](p));
}, { m: module, n: name, p: payload });

const select = (page, key) => dispatchIn(page, 'store/thunks/chat/selectConversation.ts', 'selectConversation', key);

const sendPendingIn = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { sendPending } = await import('/web-rtc-chat/src/store/thunks/chat/sendPending.ts');

  store.dispatch(sendPending('manual'));
});

// B sends `text` and A has it.
const fromB = async (a, b, text) => {
  await sendText(b.page, text);
  check(await waitFor(`A gets ${text}`, 10, async () => Boolean(await byText(a.page, text))), `A gets "${text}"`);
};

const row = page => page.locator('nav[aria-label="Contacts"] button[aria-label^="Peer"]');

const menu = async (page, item) => {
  await page.getByRole('button', { name: 'Options for Peer' }).click();

  const items = await page.getByRole('menuitem').allInnerTexts();

  if (item) {
    await page.getByRole('menuitem', { name: item, exact: true }).click();
  } else {
    await page.mouse.click(5, 5);
  }

  return items;
};

// The tab hidden or shown, as the browser tells the page.
const setHidden = (page, hidden) => page.evaluate((h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

const unread = async (type, name) => {
  log(`--- unread: Chromium with ${name}`);

  const a = await user(chromium, 'A');
  const b = await user(type, 'B');

  await createIdentity(a.page);
  await createIdentity(b.page);
  await connect(a.page, b.page);
  await pretendContact(a.page);
  await pretendContact(b.page);
  await select(a.page, null);

  // Their messages count while the chat isn't open.
  await fromB(a, b, 'one');
  await fromB(a, b, 'two');
  await fromB(a, b, 'three');

  let now = await state(a.page);

  check(now.unread?.from === (await byText(a.page, 'one')).id, 'the first unread one is the first that came');
  check(await count(a.page) === 3, 'three unread');
  check(await row(a.page).getAttribute('aria-label') === 'Peer, 3 unread', 'the row says 3 unread');
  check((await row(a.page).innerText()).includes('3'), 'the row shows 3');

  // Ours don't count, and B's view of its own chat has nothing unread.
  await sendText(a.page, 'from A');
  await waitFor('B gets it', 10, async () => Boolean(await byText(b.page, 'from A')));
  check(await count(a.page) === 3, 'our own message doesn\'t count');

  // Deleting the first unread one: the next of theirs is first, one fewer.
  await a.page.evaluate(async (id) => {
    const { store } = await import('/web-rtc-chat/src/store/store.ts');
    const { deleteMessage } = await import('/web-rtc-chat/src/store/thunks/chat/deleteMessage.ts');

    store.dispatch(deleteMessage('manual', id));
  }, (await byText(a.page, 'one')).id);
  now = await state(a.page);
  check(now.unread?.from === (await byText(a.page, 'two')).id, 'deleting the first unread one moves it to the next');
  check(await count(a.page) === 2, 'and the count drops to 2');

  // Opening the chat: read, and the line goes above the first unread one.
  await row(a.page).click();
  await a.page.getByText('Unread messages').waitFor({ timeout: 5000 });
  now = await state(a.page);
  check(now.unread === undefined, 'opening the chat reads it');
  check(now.line?.id === (await byText(a.page, 'two')).id, 'the line is at the first unread one');

  const nextOfLine = await a.page.evaluate(() => {
    const line = [...document.querySelectorAll('div')].find(d => d.textContent === 'Unread messages');

    return line?.nextElementSibling?.textContent;
  });

  check(nextOfLine?.startsWith('two'), 'the line is drawn right above it');
  check(await row(a.page).getAttribute('aria-label') === 'Peer', 'the row has no count');

  // While the chat is open and in view, new ones aren't unread and the line stays where it was.
  await fromB(a, b, 'while open');
  now = await state(a.page);
  check(now.unread === undefined, 'a message to the open chat isn\'t unread');
  check(now.line?.id === (await byText(a.page, 'two')).id, 'the line stays while the chat is open');

  // The tab hidden: theirs count; coming back reads them and puts the line before them... unless it's there already.
  await setHidden(a.page, true);
  await fromB(a, b, 'while hidden');
  check(await count(a.page) === 1, 'in a hidden tab, theirs count');
  await setHidden(a.page, false);
  now = await state(a.page);
  check(now.unread === undefined, 'coming back to the tab reads them');
  check(now.line?.id === (await byText(a.page, 'two')).id, 'the line already there stays');
  await select(a.page, null);
  await setHidden(a.page, true);
  await select(a.page, KEY);
  await fromB(a, b, 'hidden again');
  await setHidden(a.page, false);
  now = await state(a.page);
  check(now.line?.id === (await byText(a.page, 'hidden again')).id, 'coming back to the tab shows the line there');
  await select(a.page, null);
  check(await a.page.getByText('Unread messages').count() === 0, 'closing the chat takes the line away');

  // Mark as unread: a dot, no number; then Mark as read.
  let items = await menu(a.page);

  check(items[0] === 'Mark as unread', 'a read chat offers Mark as unread');
  await menu(a.page, 'Mark as unread');
  check((await state(a.page)).unread?.dot === true, 'marked as unread');
  check(await row(a.page).getAttribute('aria-label') === 'Peer, unread', 'the row says unread');

  const badge = await row(a.page).evaluate((element) => {
    const span = [...element.querySelectorAll('span')].find(s => s.className.includes('unread'));

    return span && { text: span.textContent, width: span.getBoundingClientRect().width };
  });

  check(badge && badge.text === '' && badge.width < 16, 'it shows a dot without a number');

  if (SHOTS) {
    await a.page.locator('nav[aria-label="Contacts"]').screenshot({ path: `${SHOTS}/dot-${name}.png` });
  }

  items = await menu(a.page);
  check(items[0] === 'Mark as read', 'an unread chat offers Mark as read');
  await menu(a.page, 'Mark as read');
  check((await state(a.page)).unread === undefined, 'Mark as read takes the dot away');

  // A dot and then a message: the number shows; opening clears both.
  await menu(a.page, 'Mark as unread');
  await fromB(a, b, 'after the dot');
  check(await row(a.page).getAttribute('aria-label') === 'Peer, 1 unread', 'a new message shows its number');
  await menu(a.page, 'Mark as read');
  check((await state(a.page)).unread === undefined, 'Mark as read clears the count and the dot');
  await menu(a.page, 'Mark as unread');
  await row(a.page).click();
  check((await state(a.page)).unread === undefined, 'opening the chat clears the dot');
  check(await a.page.getByText('Unread messages').count() === 0, 'a dot alone draws no line');
  await select(a.page, null);

  // A message that waited is put before ones already read: it becomes the first unread one.
  const late = { key: KEY, id: 'late1', text: 'written first' };

  await dispatchIn(b.page, 'store/chat/chatSlice.ts', 'messageQueued', late);
  await pause(1500);
  await fromB(a, b, 'read before');
  await select(a.page, KEY);
  await select(a.page, null);
  check((await state(a.page)).unread === undefined, 'read');
  await sendPendingIn(b.page);
  check(
    await waitFor('A gets the late one', 10, async () => Boolean(await byText(a.page, 'written first'))),
    'A gets the text that waited',
  );
  now = await state(a.page);

  const texts = now.messages.map(m => m.text);

  check(texts.indexOf('written first') < texts.indexOf('read before'), 'it is placed by its time');
  check(now.unread?.from === (await byText(a.page, 'written first')).id, 'and it is the first unread one');

  // After a reload the count is still there (the connection is gone, the saved chat isn't).
  await fromB(a, b, 'before reload');

  const before = await count(a.page);

  await a.page.evaluate(async () => {
    const { historySaver } = await import('/web-rtc-chat/src/core/history/historySaver.ts');

    await historySaver.flush();
  });
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();
  await waitFor('the chat loaded', 10, async () => (await state(a.page)).messages.length > 0);
  check(await count(a.page) === before && before > 0, `after a reload, still ${before} unread`);
  check(await row(a.page).getAttribute('aria-label') === `Peer, ${before} unread`, 'and the row says so');
  await menu(a.page, 'Mark as read');
  await menu(a.page, 'Mark as unread');
  await a.page.evaluate(async () => {
    const { historySaver } = await import('/web-rtc-chat/src/core/history/historySaver.ts');

    await historySaver.flush();
  });
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();
  await waitFor('the chat loaded', 10, async () => (await state(a.page)).messages.length > 0);
  check((await state(a.page)).unread?.dot === true, 'a dot stays after a reload');

  await a.browser.close();
  await b.browser.close();
};

const DAY = 24 * 60 * 60 * 1000;

// Day labels in one browser, with its clock set to `now` (local time in `timezoneId`).
const days = async (type, name) => {
  log(`--- day labels: ${name}`);

  // UTC+14: the start of a local day is still the day before in UTC.
  const timezoneId = 'Pacific/Kiritimati';
  const a = await user(type, 'A', { timezoneId });

  // 25 November 2026, 23:00 there.
  await a.page.clock.install({ time: new Date('2026-11-25T23:00:00+14:00') });
  await createIdentity(a.page);
  await pretendContact(a.page, 'friend');

  // Their texts on different days, all on the device's own clock: just after the local midnight starting today (still
  // yesterday in UTC), yesterday, three days ago, in October, and last year.
  await a.page.evaluate(async (dayMs) => {
    const { store } = await import('/web-rtc-chat/src/store/store.ts');
    const { peerTextReceived } = await import('/web-rtc-chat/src/store/chat/chatSlice.ts');
    const today = new Date().setHours(0, 0, 0, 0);
    const texts = [
      ['last year', new Date('2025-12-31T12:00:00+14:00').getTime()],
      ['in October', new Date('2026-10-02T12:00:00+14:00').getTime()],
      ['three days ago', today - 3 * dayMs + 3600000],
      ['yesterday', today - dayMs + 3600000],
      ['yesterday later', today - dayMs + 7200000],
      ['just after midnight', today + 30 * 60000],
      ['tonight', Date.now() - 60000],
    ];

    texts.forEach(([text, at], i) => store.dispatch(peerTextReceived({ key: 'friend', id: `p.d${i}`, text, at })));
  }, DAY);
  await select(a.page, 'friend');
  await a.page.getByText('tonight').waitFor();

  const labels = () => a.page.evaluate(() => [...document.querySelectorAll('div')]
    .filter(d => d.className.includes('day'))
    .map(d => d.textContent));

  const shown = await labels();

  check(
    JSON.stringify(shown) === JSON.stringify(['31 December 2025', '2 October', 'Sunday', 'Yesterday', 'Today']),
    `day labels: ${shown.join(', ')}`,
  );

  const sticky = await a.page.evaluate(() => {
    const label = [...document.querySelectorAll('div')]
      .find(d => d.textContent === 'Today' && d.className.includes('day'));

    return label && getComputedStyle(label).position;
  });

  check(sticky === 'sticky', 'a day label sticks to the top');

  if (SHOTS) {
    await a.page.screenshot({ path: `${SHOTS}/days-${name}.png` });
  }

  // Midnight passes: Today becomes Yesterday by itself.
  await a.page.clock.runFor(2 * 60 * 60 * 1000);
  await pause(300);

  const later = await labels();

  check(later.at(-1) === 'Yesterday' && later.at(-2) === 'Tuesday', `after midnight: ${later.join(', ')}`);

  await a.browser.close();
};

await unread(chromium, 'Chromium');
await unread(webkit, 'WebKit');
await days(chromium, 'Chromium');
await days(webkit, 'WebKit');

log(failures.length ? `${failures.length} failed:\n  ${failures.join('\n  ')}` : 'All passed.');
process.exit(failures.length ? 1 : 0);
