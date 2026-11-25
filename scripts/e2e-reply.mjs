// Replies: two browsers connected by hand-copied codes (the manual connection stands in for a contact, as in
// e2e-delete, so the chat is saved). Reply from the menu (right button, or a tap on a phone), the button beside a
// bubble (mouse) and a swipe to the left (touch); the reply bar, Escape and X; texts, files and locations as replies
// and as the messages answered; what can't be answered (our files not sent yet, ours given up on, the app's notes);
// the links on both sides; deleting either end (here only); a reply to a message the other side doesn't have, a
// bad id, a copy sent again; sent again after the connection; kept after a reload and in backups. Chromium with
// Chromium, then Chromium with WebKit (Firefox can't connect to another browser in the cloud container). Then the
// bubbles and the bar drawn on an iPhone, an Android phone (with a real finger swipe) and two computers, with
// screenshots if a folder is given. It reaches into the app's modules, which only the dev server serves:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-reply.mjs [folder]
import { mkdirSync } from 'node:fs';
import { chromium, devices, firefox, webkit } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
const KEY = 'manual';
const SHOTS = process.argv[2] ?? null;
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

const shot = async (page, name) => {
  if (SHOTS) {
    await pause(300);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  }
};

// `device`: a viewport, or one of Playwright's phones.
const user = async (type, name, device = { width: 1000, height: 800 }) => {
  // Chromium hides its addresses behind names WebKit can't look up.
  const browser = await type.launch(type === chromium
    ? { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] }
    : {});
  const context = await browser.newContext({
    ...(device.width ? { viewport: device } : device),
    permissions: ['geolocation'],
    geolocation: { latitude: 40.4093, longitude: 49.8671, accuracy: 10 },
  });
  const page = await context.newPage();

  page.on('pageerror', err => log(`[${name} error] ${err.message}`));
  await page.goto(URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Settings' }).waitFor();

  return { browser, context, page };
};

const openManual = async (page) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Connect manually' }).click();
};

const connect = async (a, b) => {
  const code = page => page.waitForFunction(() => document.querySelectorAll('textarea')[1]?.value.length > 10)
    .then(() => page.locator('textarea').nth(1).inputValue());

  await openManual(a);
  await openManual(b);
  await a.getByRole('button', { name: 'Host' }).click();
  await b.locator('textarea').first().fill(await code(a));
  await b.getByRole('button', { name: 'Join' }).click();
  await a.locator('textarea').first().fill(await code(b));
  await a.getByRole('button', { name: 'Connect', exact: true }).click();
  await a.getByText('Connected. Say hi!').last().waitFor({ timeout: 30000 });
  await b.getByText('Connected. Say hi!').last().waitFor({ timeout: 30000 });
};

// A contact with the manual connection's id, so its chat is saved like a contact's (and it has a name).
const pretendContact = (page, name = 'Peer') => page.evaluate(async (contactName) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { contactAdded } = await import('/web-rtc-chat/src/store/contacts/contactsSlice.ts');
  const { newContactKey } = await import('/web-rtc-chat/src/core/identity/newContactKey.ts');
  const { contactKeys } = await import('/web-rtc-chat/src/core/identity/contactKeys.ts');
  const key = await newContactKey();

  contactKeys.set('manual', key);
  store.dispatch(contactAdded({
    id: 'manual',
    name: contactName,
    favourite: false,
    verified: true,
    safety: 'test',
    identity: 'x',
    myKey: key.publicKey,
    secrets: ['s'.repeat(43)],
    sendSecret: 's'.repeat(43),
    lastConnected: null,
  }));
}, name);

const messages = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');

  return store.getState().chat.conversations.manual ?? [];
});

const find = async (page, test) => (await messages(page)).find(test);

const byText = (page, text) => find(page, m => m.text === text);

const byName = (page, name) => find(page, m => m.name === name);

const arrived = (page, test, what) => waitFor(what, 15, async () => Boolean(await find(page, test)));

// Kinds and file states, as saved (see MessageKind, FileStatus).
const LOCATION = 2;
const DONE = 1;

const run = (page, source, arg) => page.evaluate(
  async ({ s, a }) => new Function('a', `return (async () => { ${s} })();`)(a),
  { s: source, a: arg },
);

const MODULES = `
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const chat = await import('/web-rtc-chat/src/store/chat/chatSlice.ts');
  const ui = await import('/web-rtc-chat/src/store/ui/uiSlice.ts');
`;

const sendText = (page, text) => run(page, `${MODULES}
  const { sendMessage } = await import('/web-rtc-chat/src/store/thunks/chat/sendMessage.ts');
  store.dispatch(sendMessage('manual', a));
`, text);

const sendFiles = (page, names) => run(page, `${MODULES}
  const { sendFiles } = await import('/web-rtc-chat/src/store/thunks/chat/sendFiles.ts');
  const files = a.map(n => new File([new Uint8Array(3000).fill(66)], n, { type: 'text/plain' }));
  void store.dispatch(sendFiles('manual', files));
`, names);

const sendPlace = page => run(page, `${MODULES}
  const { sendLocation } = await import('/web-rtc-chat/src/store/thunks/location/sendLocation.ts');
  store.dispatch(sendLocation('manual', { lat: 40.41, lng: 49.87, accuracy: 15 }));
`);

const startReply = (page, id) => run(page, `${MODULES}
  store.dispatch(ui.replyStarted({ key: 'manual', id: a }));
`, id);

const dispatchChat = (page, name, payload) => run(page, `${MODULES}
  store.dispatch(chat[a.name](a.payload));
`, { name, payload });

const sendPendingIn = page => run(page, `${MODULES}
  const { sendPending } = await import('/web-rtc-chat/src/store/thunks/chat/sendPending.ts');
  store.dispatch(sendPending('manual'));
`);

const rawControl = (page, message) => run(page, `
  const { sendControl } = await import('/web-rtc-chat/src/core/webrtc/sendControl.ts');
  sendControl('manual', a);
`, message);

const bubble = (page, id) => page.locator(`[data-id="${id}"]`);

const field = page => page.locator('form input[type="text"]');

const replyBar = page => page.getByRole('button', { name: 'Cancel reply' });

// The items of a message's menu (then closed again).
const menuItems = async (page, id) => {
  await bubble(page, id).click({ button: 'right' });

  const items = await page.getByRole('menuitem').allInnerTexts();

  await page.keyboard.press('Escape');

  return items;
};

const fromMenu = async (page, id, item) => {
  await bubble(page, id).click({ button: 'right' });
  await page.getByRole('menuitem', { name: item, exact: true }).click();
};

// The reply button shows beside the bubble while the mouse is over it.
const fromButton = async (page, id) => {
  await bubble(page, id).hover();
  await bubble(page, id).getByRole('button', { name: 'Reply' }).click();
};

const typeAndSend = async (page, text) => {
  await field(page).fill(text);
  await field(page).press('Enter');
};

// The quote at the top of a bubble (a button of the bubble's own, unlike the reply button beside it).
const quote = (page, id) => bubble(page, id).locator(':scope > button:not([aria-label="Reply"])');

// The quote's who and what, or null.
const quoteOf = async (page, id) => {
  const element = quote(page, id);

  return await element.count() ? (await element.innerText()).replace(/\s+/g, ' ').trim() : null;
};

const deleteForMe = async (page, id) => {
  await fromMenu(page, id, 'Delete for me');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
};

const pair = async (typeB, nameB) => {
  log(`--- Chromium and ${nameB}`);

  const a = await user(chromium, 'A');
  const b = await user(typeB, nameB);

  try {
    await connect(a.page, b.page);
    await pretendContact(a.page);
    await pretendContact(b.page);

    // B answers A's text from the menu.
    await sendText(a.page, 'hello');
    check(await arrived(b.page, m => m.text === 'hello', 'hello'), 'B gets the text');

    const helloA = await byText(a.page, 'hello');
    const helloB = await byText(b.page, 'hello');

    check(helloB.id === `p.${helloA.id}`, 'their ids carry p.');
    await waitFor('confirmed', 5, async () => !(await byText(a.page, 'hello'))?.pending);
    check(
      (await menuItems(b.page, helloB.id)).join() === 'Reply,Copy text,Delete for me',
      'their text\'s menu starts with Reply',
    );
    await fromMenu(b.page, helloB.id, 'Reply');
    check(await replyBar(b.page).isVisible(), 'the reply bar shows');
    check(
      (await b.page.locator('form').locator('..').innerText()).includes('Peer\nhello'),
      'it shows who wrote it and what',
    );
    check(await field(b.page).evaluate(el => el === document.activeElement), 'the cursor goes to the field');
    await typeAndSend(b.page, 'hi back');
    check(!await replyBar(b.page).isVisible(), 'the bar goes once sent');

    const hiB = await byText(b.page, 'hi back');

    check(hiB?.replyTo === helloB.id, 'our reply has the id it answers');
    check((await byText(b.page, 'hello')).replies?.join() === hiB.id, 'the message answered lists the reply');
    check(await arrived(a.page, m => m.text === 'hi back', 'reply'), 'A gets the reply');

    const hiA = await byText(a.page, 'hi back');

    check(hiA.replyTo === helloA.id, 'it answers A\'s own message, in A\'s ids');
    check((await byText(a.page, 'hello')).replies?.join() === hiA.id, 'A\'s message lists the reply');
    check(await quoteOf(a.page, hiA.id) === 'You hello', 'A sees the quote: You, hello');
    check(await quoteOf(b.page, hiB.id) === 'Peer hello', 'B sees the quote: Peer, hello');

    // A answers with the button beside the bubble; Escape and X cancel.
    await fromButton(a.page, hiA.id);
    check(await replyBar(a.page).isVisible(), 'the button beside the bubble starts a reply');
    await field(a.page).press('Escape');
    check(!await replyBar(a.page).isVisible(), 'Escape cancels it');
    await fromButton(a.page, hiA.id);
    await replyBar(a.page).click();
    check(!await replyBar(a.page).isVisible(), 'X cancels it');
    await typeAndSend(a.page, 'plain one');
    check(await arrived(b.page, m => m.text === 'plain one', 'plain'), 'then a normal message goes');
    check((await byText(a.page, 'plain one')).replyTo === undefined, 'with no link');
    await fromButton(a.page, hiA.id);
    await typeAndSend(a.page, 'reply to reply');
    check(await arrived(b.page, m => m.text === 'reply to reply', 'rr'), 'a reply to a reply arrives');
    check((await byText(b.page, 'reply to reply')).replyTo === hiB.id, 'it answers B\'s own message');
    check(
      (await byText(b.page, 'hi back')).replies?.length === 1 && (await byText(b.page, 'hello')).replies?.length === 1,
      'each message lists only its own replies',
    );

    // A tap on the quote shows the message answered.
    const rrA = await byText(a.page, 'reply to reply');

    await quote(a.page, rrA.id).click();
    check(
      await waitFor('flash', 3, async () => /flash/.test(await bubble(a.page, hiA.id).getAttribute('class'))),
      'tapping a quote shows the message answered',
    );
    check(!await a.page.getByRole('menu').count(), 'and doesn\'t open the menu');

    // What can and can't be answered.
    const rules = await run(a.page, `
      const { canReply } = await import('/web-rtc-chat/src/store/chat/canReply.ts');
      const file = (from, status) => ({ kind: 1, id: 'f', from, name: 'x', size: 1, mime: '', url: null,
        transferred: 0, status });
      return [
        canReply({ kind: 0, id: 't', from: 'me', text: 'x', pending: true }),
        canReply({ kind: 0, id: 't', from: 'me', text: 'x', pending: true, unsent: true }),
        canReply({ kind: 0, id: 't', from: 'system', text: 'x' }),
        canReply(file('me', 3)),
        canReply(file('me', 0)),
        canReply(file('me', 2)),
        canReply(file('me', 1)),
        canReply(file('peer', 0)),
        canReply({ kind: 2, id: 'l', from: 'me', lat: 1, lng: 1, pending: true, liveUntil: Date.now() + 1e5 }),
        canReply({ kind: 3, id: 'd', from: 'peer', until: 1 }),
        canReply({ kind: 99, id: 'n', from: 'peer' }),
      ];
    `);

    check(
      rules.join() === 'true,false,false,false,false,false,true,true,true,false,false',
      'answerable: ours waiting yes, given up no, notes no; our files only once sent; theirs any time',
    );

    // Our text still waiting can be answered; its Don't send makes the reply a normal message.
    await dispatchChat(a.page, 'messageQueued', { key: KEY, id: 'waiting1', text: 'not yet' });
    check(
      (await menuItems(a.page, 'waiting1')).join() === 'Reply,Copy text,Don\'t send',
      'our waiting text can be answered',
    );
    await fromMenu(a.page, 'waiting1', 'Reply');
    await typeAndSend(a.page, 'about not yet');
    check(await arrived(b.page, m => m.text === 'about not yet', 'about'), 'the reply goes');
    check(
      (await byText(b.page, 'about not yet')).replyTo === undefined,
      'they don\'t have what it answers: a normal message there',
    );
    check(await quoteOf(a.page, (await byText(a.page, 'about not yet')).id) === 'You not yet', 'quoted here');
    await fromMenu(a.page, 'waiting1', 'Don\'t send');
    check((await byText(a.page, 'about not yet')).replyTo === undefined, 'Don\'t send: our reply loses its link');
    check(await quoteOf(a.page, (await byText(a.page, 'about not yet')).id) === null, 'and its quote');

    // Ours given up on can't be answered.
    await dispatchChat(a.page, 'messageQueued', { key: KEY, id: 'given1', text: 'given up' });
    await dispatchChat(a.page, 'messagesExpired', Date.now() + 2 * 60 * 60_000);
    check(
      (await menuItems(a.page, 'given1')).join() === 'Copy text,Send again,Delete for me',
      'ours given up on: no Reply',
    );
    await deleteForMe(a.page, 'given1');

    // Files: one of ours is answered once it arrived; a file can be a reply; of several, only the first is.
    await sendFiles(a.page, ['doc.txt']);
    check(
      await waitFor('doc sent', 15, async () => (await byName(a.page, 'doc.txt'))?.status === DONE),
      'A\'s file is sent',
    );

    const docA = await byName(a.page, 'doc.txt');
    const docB = await byName(b.page, 'doc.txt');

    check((await menuItems(a.page, docA.id)).join() === 'Reply,Delete for me', 'our sent file can be answered');
    await fromMenu(b.page, docB.id, 'Reply');
    await typeAndSend(b.page, 'got the doc');
    check(await arrived(a.page, m => m.text === 'got the doc', 'got'), 'a reply to a file arrives');
    check((await byText(a.page, 'got the doc')).replyTo === docA.id, 'it answers the file');
    check(await quoteOf(a.page, (await byText(a.page, 'got the doc')).id) === 'You doc.txt', 'quoted by its name');

    await startReply(a.page, hiA.id);
    await sendFiles(a.page, ['answer1.txt', 'answer2.txt']);
    check(await arrived(b.page, m => m.name === 'answer2.txt' && m.status === DONE, 'files'), 'two files arrive');

    const answersA = (await messages(a.page)).filter(m => m.name?.startsWith('answer'));
    const answersB = (await messages(b.page)).filter(m => m.name?.startsWith('answer'));
    const answeringA = answersA.filter(m => m.replyTo === hiA.id);
    const answeringB = answersB.filter(m => m.replyTo === hiB.id);

    check(answeringA.length === 1 && answeringB.length === 1, 'only the first file of several is the reply');
    check(answeringB[0]?.id === `p.${answeringA[0]?.id}`, 'the same file on both sides');
    check(!await replyBar(a.page).isVisible(), 'a file takes the reply');

    // A location as a reply, and answered.
    await startReply(a.page, hiA.id);
    await sendPlace(a.page);
    check(await arrived(b.page, m => m.kind === LOCATION, 'place'), 'a location arrives');
    check((await find(b.page, m => m.kind === LOCATION)).replyTo === hiB.id, 'as a reply');

    const placeB = await find(b.page, m => m.kind === LOCATION);

    await fromMenu(b.page, placeB.id, 'Reply');
    await typeAndSend(b.page, 'see you there');
    check(await arrived(a.page, m => m.text === 'see you there', 'there'), 'a reply to a location arrives');
    check(
      await quoteOf(a.page, (await byText(a.page, 'see you there')).id) === 'You Location',
      'quoted as Location',
    );
    check(
      (await byText(b.page, 'hi back')).replies?.length === 3,
      'B\'s message lists its three replies (text, file, location)',
    );
    await shot(a.page, `${nameB}-a-chat`);
    await shot(b.page, `${nameB}-b-chat`);

    // Sent again after the connection: still a reply.
    await dispatchChat(a.page, 'messageQueued', { key: KEY, id: 'later1', text: 'later reply', replyTo: hiA.id });
    await sendPendingIn(a.page);
    check(await arrived(b.page, m => m.text === 'later reply', 'later'), 'a waiting reply is sent');
    check((await byText(b.page, 'later reply')).replyTo === hiB.id, 'still as a reply');

    // A copy sent again doesn't add the reply twice; a bad id or one they don't have comes as a normal message.
    await rawControl(a.page, { t: 0, text: 'later reply', id: 'later1', replyTo: hiB.id });
    await rawControl(a.page, { t: 0, text: 'bad link', id: 'bad1', replyTo: '../x' });
    await rawControl(a.page, { t: 0, text: 'unknown link', id: 'bad2', replyTo: 'nothere' });
    await rawControl(a.page, { t: 0, text: 'self link', id: 'bad3', replyTo: 'p.bad3' });
    check(await arrived(b.page, m => m.text === 'self link', 'raw'), 'the odd ones arrive');
    check(
      (await byText(b.page, 'hi back')).replies?.filter(id => id === 'p.later1').length === 1,
      'a copy doesn\'t list the reply twice',
    );
    check(
      (await messages(b.page))
        .filter(m => ['bad link', 'unknown link', 'self link'].includes(m.text)).every(m => m.replyTo === undefined),
      'a bad id, an unknown one or itself: normal messages',
    );

    // Deleting the message answered, here only: our replies become normal messages; theirs keep the quote.
    await bubble(a.page, helloA.id).scrollIntoViewIfNeeded();
    await shot(a.page, `${nameB}-delete-before`);
    await deleteForMe(a.page, helloA.id);
    await bubble(a.page, hiA.id).scrollIntoViewIfNeeded();
    await shot(a.page, `${nameB}-delete-after`);
    await bubble(b.page, hiB.id).scrollIntoViewIfNeeded();
    await shot(b.page, `${nameB}-delete-other-side`);
    check((await byText(a.page, 'hi back')).replyTo === undefined, 'Delete for me: its reply loses the link');
    check(await quoteOf(a.page, hiA.id) === null, 'and the quote');
    check(await quoteOf(b.page, hiB.id) === 'Peer hello', 'the other side keeps theirs');

    // Deleting a reply: the message it answered forgets it; its own replies become normal messages.
    await deleteForMe(b.page, hiB.id);
    check((await byText(b.page, 'hello')).replies === undefined, 'the message answered forgets a deleted reply');
    check(
      (await messages(b.page)).every(m => m.replyTo !== hiB.id),
      'a deleted message\'s replies become normal messages',
    );

    // Answering one they deleted: it comes as a normal message there.
    await deleteForMe(b.page, docB.id);
    await fromMenu(a.page, docA.id, 'Reply');
    await typeAndSend(a.page, 'about the doc');
    check(await arrived(b.page, m => m.text === 'about the doc', 'doc reply'), 'the reply arrives');
    check(
      (await byText(b.page, 'about the doc')).replyTo === undefined,
      'they deleted what it answers: a normal message there',
    );
    check((await byText(a.page, 'about the doc')).replyTo === docA.id, 'here it is still a reply');

    // Saved: links and quotes come back after a reload.
    await pause(2500);

    const before = (await messages(a.page)).map(m => `${m.id}:${m.replyTo ?? ''}:${(m.replies ?? []).join('|')}`);

    await a.page.reload();
    await a.page.getByRole('button', { name: 'Settings' }).waitFor();
    await waitFor('history', 10, async () => (await messages(a.page)).length === before.length);

    const after = (await messages(a.page)).map(m => `${m.id}:${m.replyTo ?? ''}:${(m.replies ?? []).join('|')}`);

    check(before.join() === after.join(), 'links are the same after a reload');
    // The chat shows again (as if connected) to draw it.
    await run(a.page, `
      const { store } = await import('/web-rtc-chat/src/store/store.ts');
      const manual = await import('/web-rtc-chat/src/store/manual/manualSlice.ts');
      const ui = await import('/web-rtc-chat/src/store/ui/uiSlice.ts');
      store.dispatch(ui.conversationSelected('manual'));
      store.dispatch(manual.connected([]));
    `);
    check(
      await waitFor('quote', 5, async () => await quoteOf(a.page, (await byText(a.page, 'got the doc')).id)
        === 'You doc.txt'),
      'quotes show after a reload',
    );

    // Backups: links that aren't ids are dropped with their message.
    const kept = await run(a.page, `
      const { validMessages } = await import('/web-rtc-chat/src/core/backup/validMessages.ts');
      return validMessages([
        { kind: 0, id: 'a', from: 'me', text: 'x', replyTo: 'b' },
        { kind: 0, id: 'b', from: 'peer', text: 'y', replies: ['a'] },
        { kind: 0, id: 'c', from: 'me', text: 'z', replyTo: 5 },
        { kind: 0, id: 'd', from: 'me', text: 'z', replies: 'a' },
      ]).map(m => m.id).join();
    `);

    check(kept === 'a,b', 'a backup keeps good links and drops bad ones');
  } finally {
    await a.browser.close();
    await b.browser.close();
  }
};

// A small picture for the photo bubble.
const PICTURE = `
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 200;
  const g = canvas.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 200);
  sky.addColorStop(0, '#f6a560');
  sky.addColorStop(1, '#6d4c9f');
  g.fillStyle = sky;
  g.fillRect(0, 0, 320, 200);
  g.fillStyle = '#1d2140';
  g.beginPath();
  g.moveTo(0, 200); g.lineTo(90, 110); g.lineTo(160, 170); g.lineTo(240, 90); g.lineTo(320, 200);
  g.fill();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
`;

// A chat with every kind of reply, put straight into the manual chat (marked connected, so the field works).
const SAMPLES = `${MODULES}
  const manual = await import('/web-rtc-chat/src/store/manual/manualSlice.ts');
  ${PICTURE}
  const now = Date.now();
  const k = 'manual';
  const text = (id, from, t, at, replyTo) => from === 'me'
    ? store.dispatch(chat.messageQueued({ key: k, id, text: t, replyTo }))
    : store.dispatch(chat.peerTextReceived({ key: k, id, text: t, at, replyTo }));
  const done = id => store.dispatch(chat.messageDelivered({ key: k, id }));
  const file = (id, from, name, mime, b, extra) => store.dispatch(chat.fileAdded({ key: k, file: {
    id, from, name, size: b.size, mime, url: URL.createObjectURL(b), transferred: b.size, status: 1, at: Date.now(),
    ...extra,
  } }));

  store.dispatch(manual.connected([]));
  text('p.q1', 'peer', 'Are we still on for dinner tomorrow?', now - 900000);
  text('a1', 'me', 'Yes! 7 pm at the usual place.', 0, 'p.q1');
  done('a1');
  file('ph1', 'me', 'sunset.png', 'image/png', blob, {});
  text('p.a2', 'peer', 'Wow, where was this taken?', now - 600000, 'ph1');
  file('p.v1', 'peer', 'voice.webm', 'audio/webm', new Blob([new Uint8Array(500)], { type: 'audio/webm' }),
    { note: { type: 0, duration: 7000, wave: Array.from({ length: 40 }, (_, i) => (i * 7) % 28 + 3) } });
  text('a3', 'me', 'Haha, I listened to it twice', 0, 'p.v1');
  done('a3');
  store.dispatch(chat.locationAdded({ key: k, message: { kind: 2, id: 'loc1', from: 'me', lat: 40.4093,
    lng: 49.8671, accuracy: 12, at: Date.now() } }));
  text('p.a4', 'peer', 'On my way, 10 minutes', now, 'loc1');
  text('p.q5', 'peer', 'Also, could you bring the long cable for the projector and the small speaker we used last '
    + 'time? The one in the blue box.', now);
  text('a5', 'me', 'Sure', 0, 'p.q5');
  done('a5');
  file('p.vo2', 'peer', 'voice2.webm', 'audio/webm', new Blob([new Uint8Array(500)], { type: 'audio/webm' }),
    { replyTo: 'a5', note: { type: 0, duration: 3000, wave: Array.from({ length: 40 }, (_, i) => (i * 5) % 20 + 3) } });
  file('vn1', 'me', 'video.webm', 'video/webm', new Blob([new Uint8Array(500)], { type: 'video/webm' }),
    { replyTo: 'p.vo2', note: { type: 1, duration: 4000 } });
`;

// A finger on the screen (Chromium's own touch events, so the browser decides about scrolling as for a real one).
const fingerSwipe = async (page, element, dx, dy, lift = true) => {
  await element.scrollIntoViewIfNeeded();

  const box = await element.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  const touch = (type, px, py) => cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: py }],
  });

  await touch('touchStart', x, y);

  for (let i = 1; i <= 8; i += 1) {
    await touch('touchMove', x + (dx * i) / 8, y + (dy * i) / 8);
    await pause(16);
  }

  if (lift) {
    await touch('touchEnd');
  }

  return () => touch('touchEnd');
};

// The same with pointer events sent from the page, for WebKit.
const pointerSwipe = (element, dx, lift = true) => element.evaluate(async (el, { d, l }) => {
  const box = el.getBoundingClientRect();
  const base = { bubbles: true, pointerType: 'touch', pointerId: 7, isPrimary: true, clientY: box.y + box.height / 2 };
  const x = box.x + box.width / 2;

  el.dispatchEvent(new PointerEvent('pointerdown', { ...base, clientX: x }));

  for (let i = 1; i <= 8; i += 1) {
    el.dispatchEvent(new PointerEvent('pointermove', { ...base, clientX: x + (d * i) / 8 }));
    await new Promise(resolve => setTimeout(resolve, 16));
  }

  if (l) {
    el.dispatchEvent(new PointerEvent('pointerup', { ...base, clientX: x + d }));
  }
}, { d: dx, l: lift });

const drawn = async (label, engine, device) => {
  log(`--- ${label}`);

  const a = await user(engine, 'A', device);
  const { page } = a;
  const phone = !device.width;
  const realFinger = phone && engine === chromium;

  try {
    await openManual(page);
    await pretendContact(page, 'Alex');
    await run(page, SAMPLES);
    await pause(500);
    check(await quoteOf(page, 'a1') === 'Alex Are we still on for dinner tomorrow?', `${label}: text quoted`);
    check(await quoteOf(page, 'p.a2') === 'You Photo', `${label}: photo quoted`);
    check(await quoteOf(page, 'a3') === 'Alex Voice message', `${label}: voice message quoted`);
    check(await quoteOf(page, 'p.a4') === 'You Location', `${label}: location quoted`);
    check(await quoteOf(page, 'p.vo2') === 'You Sure', `${label}: a voice message as a reply`);
    check(await quoteOf(page, 'vn1') === 'Alex Voice message', `${label}: a video message as a reply`);

    const long = await quote(page, 'a5').evaluate((el) => {
      const preview = el.lastElementChild;

      return preview.scrollWidth > preview.clientWidth;
    });

    check(long, `${label}: a long quote is cut to one line`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth
      || [...document.querySelectorAll('[data-id]')].some(el => el.parentElement.scrollWidth
        > el.parentElement.clientWidth));

    check(!overflow, `${label}: nothing wider than the screen`);
    await shot(page, `${label}-bubbles`);

    if (phone) {
      // On a phone the button beside the bubble never shows; a tap opens the menu with Reply first.
      await bubble(page, 'p.a4').hover().catch(() => undefined);
      check(
        !await bubble(page, 'p.a4').getByRole('button', { name: 'Reply' }).isVisible(),
        `${label}: no reply button on a phone`,
      );

      // On its text, below the quote (a tap on the quote shows the message answered).
      const box = await bubble(page, 'p.a4').boundingBox();

      await bubble(page, 'p.a4').tap({ position: { x: 12, y: box.height - 10 } });
      check(
        (await page.getByRole('menuitem').allInnerTexts()).join() === 'Reply,Copy text,Delete for me',
        `${label}: a tap opens the menu, Reply first`,
      );
      await page.getByRole('menuitem', { name: 'Reply' }).click();
      check(await replyBar(page).isVisible(), `${label}: Reply from the menu`);
      await replyBar(page).click();

      // A short swipe, or up and down, doesn't answer; a long one to the left does.
      const target = bubble(page, 'p.a2');

      if (realFinger) {
        await fingerSwipe(page, target, -30, 0);
        check(!await replyBar(page).isVisible(), `${label}: a short swipe doesn't answer`);
        await fingerSwipe(page, target, -4, -120);
        check(!await replyBar(page).isVisible(), `${label}: scrolling doesn't answer`);
        // Let the scroll settle before the next finger.
        await pause(1000);
        await fingerSwipe(page, target, 80, 0);
        check(!await replyBar(page).isVisible(), `${label}: a swipe to the right doesn't answer`);

        const lift = await fingerSwipe(page, target, -90, 0, false);

        check(
          /translateX\(-/.test(await target.getAttribute('style') ?? ''),
          `${label}: the bubble follows the finger`,
        );
        await shot(page, `${label}-swiping`);
        await lift();
      } else {
        await pointerSwipe(target, -30);
        check(!await replyBar(page).isVisible(), `${label}: a short swipe doesn't answer`);
        await pointerSwipe(target, -90, false);
        check(
          /translateX\(-/.test(await target.getAttribute('style') ?? ''),
          `${label}: the bubble follows the finger`,
        );
        await shot(page, `${label}-swiping`);
        await target.evaluate(el => el.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          pointerType: 'touch',
          pointerId: 7,
          isPrimary: true,
        })));
      }

      check(await waitFor('bar', 3, () => replyBar(page).isVisible()), `${label}: a swipe to the left answers`);
      check(await page.getByRole('menu').count() === 0, `${label}: a swipe doesn't open the menu`);
      check(
        await waitFor('back', 2, async () => !/translateX/.test(await target.getAttribute('style') ?? '')),
        `${label}: the bubble slides back`,
      );
    } else {
      await bubble(page, 'p.a4').hover();
      check(
        await bubble(page, 'p.a4').getByRole('button', { name: 'Reply' }).isVisible(),
        `${label}: the reply button shows beside the bubble`,
      );
      await shot(page, `${label}-hover-theirs`);
      await bubble(page, 'a3').hover();
      await shot(page, `${label}-hover-ours`);
      await bubble(page, 'p.a2').hover();
      await bubble(page, 'p.a2').getByRole('button', { name: 'Reply' }).click();
      check(await replyBar(page).isVisible(), `${label}: the button starts a reply`);
    }

    await field(page).fill('It was at the lake');
    await shot(page, `${label}-reply-bar`);
    await field(page).press('Enter');
    check(!await replyBar(page).isVisible(), `${label}: sent`);
    check(
      (await byText(page, 'It was at the lake'))?.replyTo === 'p.a2',
      `${label}: the new message answers the one chosen`,
    );
    await shot(page, `${label}-sent`);

    // A tap on a quote shows the message answered.
    await quote(page, 'a1').click();
    check(
      await waitFor('flash', 3, async () => /flash/.test(await bubble(page, 'p.q1').getAttribute('class'))),
      `${label}: a tap on a quote shows the message`,
    );
    await shot(page, `${label}-shown`);
  } finally {
    await a.browser.close();
  }
};

if (SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
}

await pair(chromium, 'Chromium');
await pair(webkit, 'WebKit');

await drawn('iphone', webkit, devices['iPhone 13']);
await drawn('android', chromium, devices['Pixel 7']);
await drawn('chromium-desktop', chromium, { width: 1280, height: 800 });
await drawn('firefox-desktop', firefox, { width: 1280, height: 800 });
await drawn('mac-desktop', webkit, { width: 1280, height: 800 });

log(failures.length ? `${failures.length} FAILED:\n${failures.join('\n')}` : 'All passed');
process.exit(failures.length ? 1 : 0);
