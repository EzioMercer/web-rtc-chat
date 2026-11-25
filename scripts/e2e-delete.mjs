// Deleting a message on our side only, and how our messages are sent: two browsers connected by hand-copied codes
// (the manual connection stands in for a contact, as in e2e-profile, so the chat is saved). The menu (right button
// or long press): Delete for me (asks), Don't send (doesn't), Send again; the marks ◷ / ✓ / ✓✓ / Not sent, ◷
// again when the connection breaks, giving up after an hour, a late text placed by time; texts, files, files still
// travelling (deleted by either side, or broken and sent again into the same message), a file sent again to one
// who has or deleted it, live locations (theirs keeps moving, ours stops, its stop sent later); copies sent again
// don't come back, a reload keeps it deleted, a file's saved pieces go, left-over pieces are removed at unlock,
// markers go after the hour, and deleting an older message doesn't scroll the chat. Chromium with
// Chromium, then Chromium with WebKit (Firefox can't connect to another browser in the cloud container). It reaches
// into the app's modules, which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-delete.mjs
import { chromium, webkit } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
const KEY = 'manual';
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

const user = async (type, name) => {
  // Chromium hides its addresses behind names WebKit can't look up.
  const browser = await type.launch(type === chromium
    ? { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] }
    : {});
  const context = await browser.newContext({
    viewport: { width: 1000, height: 800 },
    permissions: type === chromium ? ['geolocation', 'clipboard-read', 'clipboard-write'] : ['geolocation'],
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

// A contact with the manual connection's id, so its chat is saved like a contact's.
const pretendContact = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { contactAdded } = await import('/web-rtc-chat/src/store/contacts/contactsSlice.ts');
  const { newContactKey } = await import('/web-rtc-chat/src/core/identity/newContactKey.ts');
  const { contactKeys } = await import('/web-rtc-chat/src/core/identity/contactKeys.ts');
  const key = await newContactKey();

  contactKeys.set('manual', key);
  store.dispatch(contactAdded({
    id: 'manual',
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
});

const messages = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');

  return store.getState().chat.conversations.manual ?? [];
});

const find = async (page, test) => (await messages(page)).find(test);

// Kinds, as saved (see MessageKind).
const FILE = 1;
const LOCATION = 2;
const DELETED = 3;

const sendText = (page, text) => page.evaluate(async (t) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { sendMessage } = await import('/web-rtc-chat/src/store/thunks/chat/sendMessage.ts');

  store.dispatch(sendMessage('manual', t));
}, text);

// `random`: bytes that don't zip, so they travel at full size.
const sendFile = (page, name, size, random) => page.evaluate(async ({ n, s, r }) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { sendFiles } = await import('/web-rtc-chat/src/store/thunks/chat/sendFiles.ts');
  const bytes = new Uint8Array(s);

  if (r) {
    for (let i = 0; i < s; i += 65536) {
      crypto.getRandomValues(bytes.subarray(i, Math.min(s, i + 65536)));
    }
  } else {
    bytes.fill(65);
  }

  const type = r ? 'application/octet-stream' : 'text/plain';

  void store.dispatch(sendFiles('manual', [new File([bytes], n, { type })]));
}, { n: name, s: size, r: random });

// Deletes the first message `test` (a function's source) picks as soon as it shows up, from inside the page.
const deleteWhenSeen = (page, test) => page.evaluate(async (source) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { deleteMessage } = await import('/web-rtc-chat/src/store/thunks/chat/deleteMessage.ts');

  const pick = new Function('m', `return (${source})(m);`);

  const look = () => {
    const message = (store.getState().chat.conversations.manual ?? []).find(m => pick(m));

    if (message) {
      unsubscribe();
      window.deletedWhile = message.status;
      store.dispatch(deleteMessage('manual', message.id));
    }
  };

  const unsubscribe = store.subscribe(look);

  look();
}, test.toString());

// Saved pieces of a file, or every piece in the chat's slot.
const savedPieces = (page, id) => page.evaluate(async (fileId) => {
  const { kv } = await import('/web-rtc-chat/src/core/storage/kv.ts');
  const { historyKeys } = await import('/web-rtc-chat/src/core/history/historyKeys.ts');
  const { slots } = await import('/web-rtc-chat/src/core/history/slots.ts');
  const slot = slots.map.get('manual');

  if (!slot) {
    return -1;
  }

  return (await kv.keys(fileId ? historyKeys.chunksOf(slot, fileId) : historyKeys.filesOf(slot))).length;
}, id);

const inMemory = (page, id) => page.evaluate(async (fileId) => {
  const { memoryFiles } = await import('/web-rtc-chat/src/core/history/memoryFiles.ts');
  const { memoryFileKey } = await import('/web-rtc-chat/src/core/history/memoryFileKey.ts');

  return memoryFiles.has(memoryFileKey('manual', fileId));
}, id);

// Opens a message's menu (right button, or a finger held on it) and picks `item`; "Delete for me" then answers its
// question. Returns the question's text, or null when none came.
const pick = async (page, bubble, how, item = 'Delete for me') => {
  if (how === 'hold') {
    // A finger held still on it (pointer events as a touch screen sends them).
    await bubble.evaluate(async (element) => {
      const box = element.getBoundingClientRect();
      const at = { bubbles: true, pointerType: 'touch', clientX: box.x + 10, clientY: box.y + 10, isPrimary: true };

      element.dispatchEvent(new PointerEvent('pointerdown', at));
      await new Promise(resolve => setTimeout(resolve, 700));
      element.dispatchEvent(new PointerEvent('pointerup', at));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
  } else {
    await bubble.click({ button: 'right' });
  }

  await page.getByRole('menuitem', { name: item, exact: true }).click();
  await pause(300);

  const dialog = page.getByRole('alertdialog');

  if (!await dialog.count()) {
    return null;
  }

  const question = await dialog.innerText();

  await dialog.getByRole('button', { name: 'Delete' }).click();

  return question;
};

// The items of a message's menu (then closed again).
const menuItems = async (page, bubble) => {
  await bubble.click({ button: 'right' });

  const items = await page.getByRole('menuitem').allInnerTexts();

  await page.keyboard.press('Escape');

  return items;
};

const dispatchIn = (page, module, name, payload) => page.evaluate(async ({ m, n, p }) => {
  const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');
  const actions = await import(`/web-rtc-chat/src/${m}`);

  appStore.dispatch(actions[n](p));
}, { m: module, n: name, p: payload });

const slice = 'store/chat/chatSlice.ts';

const sendPendingIn = page => page.evaluate(async () => {
  const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');
  const { sendPending } = await import('/web-rtc-chat/src/store/thunks/chat/sendPending.ts');

  appStore.dispatch(sendPending('manual'));
});

// The bubble of a text (it also shows the time, so its text is more than the message's).
const textBubble = (page, text) => page.locator('[data-id]').filter({ hasText: new RegExp(`^${text}`) });

// The mark next to one of our texts: its label.
const markOf = (page, text) => page.getByText(text).locator('span[aria-label], span:text("Not sent")').first()
  .evaluate(el => el.getAttribute('aria-label') ?? el.textContent);

const run = async (typeB, nameB) => {
  log(`--- Chromium and ${nameB}`);

  const a = await user(chromium, 'A');
  const b = await user(typeB, nameB);

  await connect(a.page, b.page);
  await pretendContact(a.page);
  await pretendContact(b.page);

  // Texts: B deletes one of A's, with the right button.
  await sendText(a.page, 'first text');
  await sendText(a.page, 'second text');
  check(await waitFor('B gets both', 10, async () => (await messages(b.page)).length >= 2), 'B gets two texts');

  const first = await find(b.page, m => m.text === 'first text');

  check(
    (await menuItems(b.page, textBubble(b.page, 'first text'))).join()
    === 'Reply,Copy text,Delete for me',
    'their text\'s menu: Reply, Copy text, Delete for me',
  );

  const question = await pick(b.page, textBubble(b.page, 'first text'), 'right');

  check(question?.includes('Delete for me?') && question.includes('It is deleted only on this device.')
    && !question.includes('still has'), 'Delete for me asks, in short');
  check(await textBubble(b.page, 'first text').count() === 0, 'the text is gone from the screen');

  const stub = await find(b.page, m => m.id === first.id);

  check(
    stub?.kind === DELETED && stub.text === undefined && stub.until > Date.now() + 60 * 60_000 - 60_000,
    'only its id stays, for about an hour',
  );

  // A sends it again, as after a lost confirmation: it doesn't come back.
  await a.page.evaluate(async (id) => {
    const { sendControl } = await import('/web-rtc-chat/src/core/webrtc/sendControl.ts');
    const { ControlType } = await import('/web-rtc-chat/src/core/webrtc/types.ts');

    sendControl('manual', { t: ControlType.Text, text: 'first text', id });
  }, first.id.slice(2));
  await pause(1000);
  check(await textBubble(b.page, 'first text').count() === 0, 'a copy sent again doesn\'t come back');
  check(Boolean(await find(a.page, m => m.text === 'first text')), 'A still has it');
  check(await markOf(a.page, 'second text') === 'Delivered', 'a confirmed text shows ✓✓');

  // B deletes its own delivered text: A keeps it.
  await sendText(b.page, 'from B');
  check(
    await waitFor('A gets B\'s text', 10, async () => Boolean(await find(a.page, m => m.text === 'from B'))),
    'A gets B\'s text',
  );
  await waitFor('confirmed', 5, async () => !(await find(b.page, m => m.text === 'from B'))?.pending);
  await pick(b.page, b.page.getByText('from B'), 'right');
  check(!(await find(b.page, m => m.text === 'from B')), 'our own text goes completely');
  check(Boolean(await find(a.page, m => m.text === 'from B')), 'and they keep it');

  // A text that hasn't gone anywhere: ◷, and Don't send removes it without a question.
  await dispatchIn(b.page, slice, 'messageQueued', { key: KEY, id: 'waiting1', text: 'never sent' });
  check(await markOf(b.page, 'never sent') === 'Not sent yet', 'a text not sent yet shows ◷');
  check(
    (await menuItems(b.page, b.page.getByText('never sent'))).join() === 'Reply,Copy text,Don\'t send',
    'its menu: Reply, Copy text, Don\'t send',
  );
  check(
    await pick(b.page, b.page.getByText('never sent'), 'right', 'Don\'t send') === null,
    'Don\'t send asks nothing',
  );
  await sendPendingIn(b.page);
  await pause(1000);
  check(!(await find(b.page, m => m.text === 'never sent')), 'it is gone');
  check(!(await find(a.page, m => m.text === 'never sent')), 'and never sent');

  // Sent but not confirmed: ✓ and Delete for me; the connection breaks: ◷ again.
  await dispatchIn(b.page, slice, 'messageQueued', { key: KEY, id: 'onway1', text: 'on its way' });
  await dispatchIn(b.page, slice, 'messagesSent', { key: KEY, ids: ['onway1'] });
  check(await markOf(b.page, 'on its way') === 'Sent', 'a text the connection took shows ✓');
  check(
    (await menuItems(b.page, b.page.getByText('on its way'))).join() === 'Reply,Copy text,Delete for me',
    'its menu: Reply, Copy text, Delete for me',
  );
  await dispatchIn(b.page, slice, 'connectionLost', KEY);
  check(
    await markOf(b.page, 'on its way') === 'Will be sent again',
    'when the connection breaks it shows ↻ (it went out once)',
  );
  check(
    (await menuItems(b.page, b.page.getByText('on its way'))).join() === 'Reply,Copy text,Delete for me',
    'so it can\'t be held back: Delete for me',
  );

  // Don't send picked from a menu opened while it hadn't left, after it went out: it asks instead.
  await dispatchIn(b.page, slice, 'messageQueued', { key: KEY, id: 'race1', text: 'just leaving' });
  await b.page.getByText('just leaving').click({ button: 'right' });
  await dispatchIn(b.page, slice, 'messagesSent', { key: KEY, ids: ['race1'] });
  check(
    await b.page.getByRole('menuitem', { name: 'Don\'t send' }).count() === 1,
    'an open menu keeps what it offered',
  );
  await b.page.getByRole('menuitem', { name: 'Don\'t send' }).click();
  check(await b.page.getByRole('alertdialog').count() === 1, 'Don\'t send after it went out asks Delete for me?');
  await b.page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  check(Boolean(await find(b.page, m => m.id === 'race1')), 'and Cancel keeps it');

  // A retry is placed where it was written: B's text waited, A answered meanwhile.
  await sendPendingIn(b.page);
  check(
    await waitFor('A gets it', 10, async () => Boolean(await find(a.page, m => m.text === 'on its way'))),
    'the waiting text goes when the connection is there',
  );
  await dispatchIn(b.page, slice, 'messageQueued', { key: KEY, id: 'late1', text: 'written first' });
  await pause(1500);
  await sendText(a.page, 'answered later');
  await waitFor('B gets the answer', 10, async () => Boolean(await find(b.page, m => m.text === 'answered later')));
  await sendPendingIn(b.page);
  check(
    await waitFor('A gets the late one', 10, async () => Boolean(await find(a.page, m => m.text === 'written first'))),
    'A gets the late text',
  );

  const order = (await messages(a.page)).map(m => m.text);

  check(order.indexOf('written first') < order.indexOf('answered later'), 'it is placed before what came after it');

  // Not confirmed within an hour: "Not sent", with Send again, which puts it at the end.
  await dispatchIn(b.page, slice, 'messageQueued', { key: KEY, id: 'old1', text: 'given up' });
  await dispatchIn(b.page, slice, 'messagesExpired', Date.now() + 60 * 60_000 + 5000);
  check(await markOf(b.page, 'given up') === 'Not sent', 'after an hour it shows Not sent');
  await sendPendingIn(b.page);
  await pause(800);
  check(!(await find(a.page, m => m.text === 'given up')), 'and is no longer sent by itself');
  check(
    (await menuItems(b.page, b.page.getByText('given up'))).join() === 'Copy text,Send again,Delete for me',
    'its menu: Copy text, Send again, Delete for me',
  );
  await sendText(a.page, 'meanwhile');
  await waitFor('B gets meanwhile', 10, async () => Boolean(await find(b.page, m => m.text === 'meanwhile')));
  await pick(b.page, b.page.getByText('given up'), 'right', 'Send again');
  check(
    await waitFor('A gets it', 10, async () => Boolean(await find(a.page, m => m.text === 'given up'))),
    'Send again sends it',
  );

  const mine = (await messages(b.page)).filter(m => m.kind !== DELETED).map(m => m.text);
  const theirs = (await messages(a.page)).map(m => m.text);

  check(mine.at(-1) === 'given up' && theirs.at(-1) === 'given up', 'at the end, on both sides');
  check(await waitFor('✓✓', 5, async () => await markOf(b.page, 'given up') === 'Delivered'), 'and it is delivered');

  // A file that arrived and was saved: deleted with a long press, its saved pieces go too.
  await sendFile(a.page, 'notes.txt', 3 * 1024 * 1024, false);
  check(
    await waitFor('file arrives', 20, async () => (await find(b.page, m => m.name === 'notes.txt'))?.status === 1),
    'B gets a file',
  );

  const notes = await find(b.page, m => m.name === 'notes.txt');

  check(
    await waitFor('pieces saved', 10, async () => await savedPieces(b.page, notes.id) === 3),
    'its content is saved in 3 pieces',
  );
  await pick(b.page, b.page.getByText('notes.txt').first(), 'hold');
  check((await find(b.page, m => m.id === notes.id))?.kind === DELETED, 'a long press deletes a file');
  check(
    await waitFor('pieces gone', 10, async () => await savedPieces(b.page, notes.id) === 0),
    'its saved pieces are deleted',
  );
  check(!(await inMemory(b.page, notes.id)), 'and it is freed from memory');

  // Our file is saved as soon as it is chosen, so it can be sent again after a reload.
  const ourNotes = await find(a.page, m => m.name === 'notes.txt');

  check(
    await waitFor('A saved it', 10, async () => await savedPieces(a.page, ourNotes.id) === 3),
    'our file\'s content is saved too',
  );

  // A sends it again (as if B's confirmation was lost): B, who deleted it, only confirms.
  await dispatchIn(a.page, slice, 'fileWaiting', { key: KEY, id: ourNotes.id });
  await sendPendingIn(a.page);
  check(
    await waitFor('A done', 10, async () => (await find(a.page, m => m.id === ourNotes.id))?.status === 1),
    'a file sent again to one who deleted it is just confirmed',
  );
  check(!(await find(b.page, m => m.kind === FILE && m.name === 'notes.txt')), 'and doesn\'t come back');

  // One B has: also just confirmed, and still once.
  await sendFile(a.page, 'kept.txt', 100 * 1024, false);
  await waitFor('kept arrives', 10, async () => (await find(b.page, m => m.name === 'kept.txt'))?.status === 1);

  const kept = await find(a.page, m => m.name === 'kept.txt');

  await dispatchIn(a.page, slice, 'fileWaiting', { key: KEY, id: kept.id });
  await sendPendingIn(a.page);
  check(
    await waitFor('A done', 10, async () => (await find(a.page, m => m.id === kept.id))?.status === 1),
    'a file B already has is confirmed',
  );
  check((await messages(b.page)).filter(m => m.name === 'kept.txt').length === 1, 'and B has it once');

  // A big file that breaks on the way: it waits (◷) and goes again into the same message.
  await b.page.evaluate(async () => {
    const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');
    const { fileTransfers } = await import('/web-rtc-chat/src/core/webrtc/fileTransfers.ts');
    const { memoryFileKey } = await import('/web-rtc-chat/src/core/history/memoryFileKey.ts');

    const look = () => {
      const file = (appStore.getState().chat.conversations.manual ?? [])
        .find(m => m.name === 'broken.bin' && m.status === 0 && m.transferred > 0);

      if (file) {
        unsubscribe();
        fileTransfers.get(memoryFileKey('manual', file.id))?.();
      }
    };

    const unsubscribe = appStore.subscribe(look);
  });
  await sendFile(a.page, 'broken.bin', 20 * 1024 * 1024, true);
  check(
    await waitFor('A waits', 30, async () => (await find(a.page, m => m.name === 'broken.bin'))?.status === 3),
    'a file whose transfer broke waits to be sent again',
  );
  check(
    await waitFor('B failed', 5, async () => (await find(b.page, m => m.name === 'broken.bin'))?.status === 2),
    'B shows it as stopped',
  );
  await sendPendingIn(a.page);
  check(
    await waitFor('A done', 30, async () => (await find(a.page, m => m.name === 'broken.bin'))?.status === 1),
    'it goes again and arrives',
  );

  const broken = (await messages(b.page)).filter(m => m.name === 'broken.bin');

  check(broken.length === 1 && broken[0].status === 1, 'into the same message on B\'s side');

  // A big file deleted by B while it is still arriving: A waits, and its retry is just confirmed.
  await deleteWhenSeen(b.page, m => m.name === 'big-in.bin' && m.status === 0);
  await sendFile(a.page, 'big-in.bin', 40 * 1024 * 1024, true);
  check(
    await waitFor('A waits', 30, async () => (await find(a.page, m => m.name === 'big-in.bin'))?.status === 3),
    'deleting a file while it arrives stops it on their side',
  );
  check(await b.page.evaluate(() => window.deletedWhile) === 0, 'it was deleted while still arriving');
  check(!(await b.page.getByText('big-in.bin').count()), 'and it is gone here');
  await sendPendingIn(a.page);
  check(
    await waitFor('A done', 10, async () => (await find(a.page, m => m.name === 'big-in.bin'))?.status === 1),
    'their retry is just confirmed',
  );
  check(!(await find(b.page, m => m.kind === FILE && m.name === 'big-in.bin')), 'and it doesn\'t come back');

  // A big file of A's while it goes out: Don't send, without a question; it stops on both sides.
  await sendFile(a.page, 'big-out.bin', 40 * 1024 * 1024, true);
  await waitFor('sending', 10, async () => (await find(a.page, m => m.name === 'big-out.bin'))?.transferred > 0);
  check(
    (await menuItems(a.page, a.page.getByText('big-out.bin').first())).join() === 'Don\'t send',
    'a file still sending: Don\'t send',
  );
  check(
    await pick(a.page, a.page.getByText('big-out.bin').first(), 'right', 'Don\'t send') === null,
    'and no question',
  );
  check(
    await waitFor('B sees it stop', 30, async () => (await find(b.page, m => m.name === 'big-out.bin'))?.status === 2),
    'Don\'t send stops it on their side',
  );
  check(!(await find(a.page, m => m.name === 'big-out.bin')), 'and it is gone for the sender');

  // Their live location: deleted, its next moves don't bring it back.
  await a.page.evaluate(async () => {
    const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');
    const { startLiveLocation } = await import('/web-rtc-chat/src/store/thunks/location/startLiveLocation.ts');

    appStore.dispatch(startLiveLocation('manual', { lat: 40.4093, lng: 49.8671, accuracy: 10 }, 15 * 60_000));
  });
  check(
    await waitFor('B gets the live location', 10, async () => Boolean(await find(b.page, m => m.kind === LOCATION))),
    'B gets a live location',
  );

  const live = await find(b.page, m => m.kind === LOCATION);

  await pick(b.page, b.page.locator('[class*="card"]').first(), 'right');
  check((await find(b.page, m => m.id === live.id))?.kind === DELETED, 'B deletes their live location');
  await a.page.evaluate(async () => {
    const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');
    const { changeOurLocation } = await import('/web-rtc-chat/src/store/thunks/location/changeOurLocation.ts');
    const ours = appStore.getState().chat.conversations.manual.find(m => m.kind === 2 && m.from === 'me');

    appStore.dispatch(changeOurLocation('manual', ours.id, { lat: 40.42, lng: 49.88 }));
  });
  await pause(1500);
  check((await find(b.page, m => m.id === live.id))?.kind === DELETED, 'its next move doesn\'t bring it back');

  // Our live location: deleting it stops sharing it.
  const liveQuestion = await pick(a.page, a.page.locator('[class*="card"]').first(), 'right');

  check(liveQuestion?.includes('Sharing your live location stops too.'), 'the question says sharing stops');
  check(await a.page.evaluate(async () => {
    const { liveWatches } = await import('/web-rtc-chat/src/core/location/liveWatches.ts');

    return liveWatches.size === 0;
  }), 'deleting our live location stops following us');
  check(await waitFor('gone', 5, async () => !(await messages(a.page)).some(m => m.kind === LOCATION
    || m.kind === DELETED)), 'and once its stop is confirmed nothing of it is left');

  // Another one, deleted while its stop can't get through: the stop goes when the connection is back.
  await a.page.evaluate(async () => {
    const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');
    const { startLiveLocation } = await import('/web-rtc-chat/src/store/thunks/location/startLiveLocation.ts');

    appStore.dispatch(startLiveLocation('manual', { lat: 40.42, lng: 49.88, accuracy: 10 }, 15 * 60_000));
  });
  check(
    await waitFor('B gets another', 10, async () => Boolean(await find(b.page, m => m.kind === LOCATION))),
    'B gets another live location',
  );
  await a.page.evaluate(async () => {
    const { sessions } = await import('/web-rtc-chat/src/core/webrtc/state.ts');
    const channel = sessions.get('manual').channel;

    window.realSend = channel.send.bind(channel);
    channel.send = () => undefined;
  });
  await pick(a.page, a.page.locator('[class*="card"]').first(), 'right');
  await pause(1000);
  check((await find(a.page, m => m.kind === DELETED))?.stop !== undefined, 'its stop waits, hidden');
  check((await find(b.page, m => m.kind === LOCATION))?.liveUntil > Date.now() + 60_000, 'B still sees it live');
  await a.page.evaluate(async () => {
    const { sessions } = await import('/web-rtc-chat/src/core/webrtc/state.ts');

    sessions.get('manual').channel.send = window.realSend;
  });
  await sendPendingIn(a.page);
  check(await waitFor('B sees it stop', 10, async () => (await find(b.page, m => m.kind === LOCATION))?.liveUntil
    <= Date.now() + 1000), 'when the connection is back, they see it stopped');
  check(
    await waitFor('marker gone', 5, async () => !(await find(a.page, m => m.kind === DELETED))),
    'and the hidden stop is gone',
  );

  // Deleting an older message keeps the chat where it is.
  for (let i = 0; i < 40; i += 1) {
    await sendText(a.page, `filler ${i}`);
  }

  await waitFor('fillers', 10, async () => Boolean(await find(b.page, m => m.text === 'filler 39')));
  await textBubble(b.page, 'second text').scrollIntoViewIfNeeded();

  const listTop = () => b.page.evaluate(() => document.querySelector('[class*="list"]')?.scrollTop ?? -1);

  const before = await listTop();

  await pick(b.page, textBubble(b.page, 'second text'), 'right');
  check(Math.abs(await listTop() - before) < 200, 'deleting an older message doesn\'t jump to the end');

  // After a reload: still deleted, nothing comes back, and pieces left by no message are removed.
  await b.page.evaluate(async () => {
    const { kv } = await import('/web-rtc-chat/src/core/storage/kv.ts');
    const { historyKeys } = await import('/web-rtc-chat/src/core/history/historyKeys.ts');
    const { historySaver } = await import('/web-rtc-chat/src/core/history/historySaver.ts');
    const { slots } = await import('/web-rtc-chat/src/core/history/slots.ts');

    await historySaver.flush();
    await kv.set(historyKeys.chunk(slots.map.get('manual'), 'leftover', 0), new Uint8Array(10));
  });
  check(await savedPieces(b.page, 'leftover') === 1, 'a left-over piece is there before the reload');
  await b.page.reload();
  await b.page.getByRole('button', { name: 'Settings' }).waitFor();

  const after = await messages(b.page);

  check(after.some(m => m.text === 'filler 39'), 'the chat is back after a reload');
  check(!after.some(m => m.text === 'first text' || m.text === 'second text' || m.text === 'from B'
    || m.name === 'notes.txt' || m.name === 'big-in.bin'), 'deleted messages stay deleted');
  check(after.some(m => m.id === first.id && m.kind === DELETED), 'their markers are kept for now');
  check(await savedPieces(b.page, 'leftover') === 0, 'pieces that belong to no message are removed');

  // Once their retries are over, the markers go too.
  await dispatchIn(b.page, slice, 'messagesExpired', Date.now() + 2 * 60 * 60_000);
  check(!(await messages(b.page)).some(m => m.kind === DELETED), 'after the hour, nothing of them is left');

  // The device's network: known to the app; offline nothing is tried, back online every contact with something
  // waiting is (here a made-up contact, with a text and a file chosen while offline).
  await b.context.setOffline(true);
  check(
    await waitFor('offline', 5, () => b.page.evaluate(async () => {
      const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');

      return !appStore.getState().app.online;
    })),
    'the app knows the device is offline',
  );

  const status = () => b.page.evaluate(async () => {
    const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');

    return appStore.getState().sessions.status.other;
  });

  await b.page.evaluate(async () => {
    const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');
    const { contactAdded } = await import('/web-rtc-chat/src/store/contacts/contactsSlice.ts');
    const { sendMessage } = await import('/web-rtc-chat/src/store/thunks/chat/sendMessage.ts');
    const { sendFiles } = await import('/web-rtc-chat/src/store/thunks/chat/sendFiles.ts');

    appStore.dispatch(contactAdded({
      id: 'other',
      name: 'Other',
      favourite: false,
      verified: false,
      safety: 'test',
      identity: 'y',
      myKey: 'k',
      secrets: ['t'.repeat(43)],
      sendSecret: 't'.repeat(43),
      lastConnected: null,
    }));
    appStore.dispatch(sendMessage('other', 'while offline'));
    await appStore.dispatch(sendFiles('other', [new File(['hello'], 'offline.txt', { type: 'text/plain' })]));
  });

  const other = await b.page.evaluate(async () => {
    const { store: appStore } = await import('/web-rtc-chat/src/store/store.ts');

    return appStore.getState().chat.conversations.other;
  });

  check(
    other?.find(m => m.text === 'while offline')?.pending && other?.find(m => m.name === 'offline.txt')?.status === 3,
    'a text and a file chosen while offline wait',
  );
  check(await status() !== 1, 'offline, no connection is tried');
  await b.context.setOffline(false);
  check(await waitFor('connecting', 5, async () => await status() === 1), 'back online, it tries that contact');

  await a.browser.close();
  await b.browser.close();
};

await run(chromium, 'Chromium');
await run(webkit, 'WebKit');

log(failures.length ? `${failures.length} failed:\n  ${failures.join('\n  ')}` : 'All passed.');
process.exit(failures.length ? 1 : 0);
