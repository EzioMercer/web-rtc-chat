// Saved chats and backups, in Chromium, Firefox and WebKit: chats and files survive a reload; backups (text only,
// with media, per chat, skipped chats) restore on a new device and across engines; name clashes; wrong passwords and
// damaged files change nothing; cancelling; one tab at a time; changing protection keeps everything; a big backup
// streams to disk. It reaches into the app's modules, which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-backup.mjs
// ENGINES=chromium,firefox limits the engines; BIG_MB sets the big backup's size (default 1024, Chromium only).
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
const ENGINES = { chromium, firefox, webkit };
const engines = (process.env.ENGINES ?? 'chromium,firefox,webkit').split(',');
const BIG_MB = Number(process.env.BIG_MB ?? 1024);
const dir = mkdtempSync(join(tmpdir(), 'e2e-backup-'));
const failures = [];
const browsers = [];

const log = message => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const check = (ok, what) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${what}`);

  if (!ok) {
    failures.push(what);
  }
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const browserFor = async (engine) => {
  const browser = await ENGINES[engine].launch();

  browsers.push(browser);

  return browser;
};

// A new device: a fresh browser profile with the app open on the setup screen.
const device = async (engine) => {
  const browser = await browserFor(engine);
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on('pageerror', err => log(`[${engine}] page error: ${err.message}`));
  await page.goto(URL);
  await page.getByRole('button', { name: 'Create my identity' }).waitFor();

  return { engine, context, page };
};

// `root`: the page, or the dialog the picker is in.
const choose = async (root, protection, passphrase) => {
  await root.getByText(protection, { exact: true }).click();

  if (passphrase) {
    await root.getByRole('textbox', { name: 'Passphrase' }).fill(passphrase);
  }
};

const create = async (page, protection = 'No protection', passphrase) => {
  await choose(page, protection, passphrase);
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Settings' }).waitFor();
};

// Contacts with our real key for each, messages and files, put straight into the store (no peers needed): the
// app saves them as it would saves ones that arrived. `chats`: [{ name, texts, files: [{ name, mime, size }] }].
const seed = (page, chats) => page.evaluate(async (chats) => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const chat = await import('/web-rtc-chat/src/store/chat/chatSlice.ts');
  const { contactAdded } = await import('/web-rtc-chat/src/store/contacts/contactsSlice.ts');
  const { contactKeys } = await import('/web-rtc-chat/src/core/identity/contactKeys.ts');
  const { newContactKey } = await import('/web-rtc-chat/src/core/identity/newContactKey.ts');
  const { memoryFiles } = await import('/web-rtc-chat/src/core/history/memoryFiles.ts');
  const { memoryFileKey } = await import('/web-rtc-chat/src/core/history/memoryFileKey.ts');
  const { historySaver } = await import('/web-rtc-chat/src/core/history/historySaver.ts');
  const { saveFileBytes } = await import('/web-rtc-chat/src/core/history/saveFileBytes.ts');

  const random = n => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const ids = [];

  for (const { name, texts, files, id: given } of chats) {
    const id = given ?? random(12);
    const key = await newContactKey();

    ids.push(id);
    contactKeys.set(id, key);
    store.dispatch(contactAdded({
      id,
      name,
      favourite: false,
      verified: true,
      safety: 'test',
      identity: random(33),
      myKey: key.publicKey,
      secrets: [random(32)],
      sendSecret: random(32),
    }));
    texts.forEach((text, i) => {
      if (i % 2) {
        store.dispatch(chat.peerTextReceived({ key: id, id: `p.${random(8)}`, text, at: Date.now() }));
      } else {
        store.dispatch(chat.messageQueued({ key: id, id: random(10), text }));
      }
    });

    for (const [i, file] of (files ?? []).entries()) {
      const bytes = new Uint8Array(file.size);

      // Text files get repeating text (it zips), the rest random bytes (it doesn't).
      if (file.mime.startsWith('text/')) {
        const text = `line ${i} of ${name}\n`.repeat(Math.ceil(file.size / 12));

        bytes.set(new TextEncoder().encode(text).slice(0, file.size));
      } else {
        for (let at = 0; at < bytes.length; at += 65536) {
          crypto.getRandomValues(bytes.subarray(at, Math.min(bytes.length, at + 65536)));
        }
      }

      const blob = new File([bytes], file.name, { type: file.mime });
      const fileId = random(10);

      memoryFiles.set(memoryFileKey(id, fileId), blob);
      store.dispatch(chat.fileAdded({
        key: id,
        file: {
          id: fileId,
          from: i % 2 ? 'peer' : 'me',
          name: file.name,
          size: blob.size,
          mime: blob.type,
          url: URL.createObjectURL(blob),
          transferred: 0,
          status: 0,
          ...(file.note ? { note: file.note } : {}),
        },
      }));
      store.dispatch(chat.fileCompleted({ key: id, id: fileId, url: URL.createObjectURL(blob) }));
      // The store saves it too; wait for it, so a reload finds it.
      await saveFileBytes(id, fileId, blob);
    }
  }

  await historySaver.flush();

  return ids;
}, chats);

// Everything the app knows, in a comparable form: contacts, our public key for each, messages, and a hash of every
// file's content (read the way the app reads it: from memory or storage).
const snapshot = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { contactKeys } = await import('/web-rtc-chat/src/core/identity/contactKeys.ts');
  const { loadFileBlob } = await import('/web-rtc-chat/src/core/history/loadFileBlob.ts');

  const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');

  const { contacts, chat } = store.getState();
  const chats = {};

  for (const contact of contacts.list) {
    const messages = [];

    for (const m of chat.conversations[contact.id] ?? []) {
      const entry = { id: m.id, kind: m.kind, from: m.from, text: m.text, pending: m.pending };

      if (m.kind === 1) {
        const { name, size, mime, status, error, note } = m;

        Object.assign(entry, { name, size, mime, status, error, note });

        if (m.status === 1) {
          try {
            const blob = await loadFileBlob(contact.id, m);

            entry.hash = hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
          } catch (err) {
            entry.hash = `error: ${err.message}`;
          }
        }
      }

      messages.push(entry);
    }

    chats[contact.name] = messages;
  }

  return {
    contacts: contacts.list.map(c => ({ ...c, key: contactKeys.get(c.id)?.publicKey }))
      .map(({ id, name, myKey, key }) => ({ id, name, myKey, key })),
    chats,
    unread: chat.unread,
    paused: store.getState().app.paused,
  };
});

const openSettings = async (page) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('heading', { name: 'Chats and backup' }).waitFor();
};

// Makes a backup through the dialog and returns the downloaded file's path. `perChat`: { name: { include, media } }.
const exportBackup = async (page, options) => {
  const { password, media = true, perChat, passphrase, file, cancelAfterMs, whileRunning } = options;

  await openSettings(page);
  await page.getByRole('button', { name: 'Back up' }).click();

  if (passphrase) {
    await page.getByRole('textbox', { name: 'Passphrase' }).fill(passphrase);
    await page.getByRole('button', { name: 'Confirm' }).click();
  }

  await page.getByRole('radio', { name: media ? 'Text and media' : 'Text only' }).click();

  if (perChat) {
    await page.getByText('Choose for each chat').click();

    for (const [name, choice] of Object.entries(perChat)) {
      const row = page.locator('div', { has: page.getByText(name, { exact: true }) })
        .filter({ has: page.getByRole('radio', { name: 'Media' }) }).last();

      if (choice.include === false) {
        await row.getByRole('checkbox').uncheck();
      }

      if (choice.media !== undefined) {
        await row.getByRole('radio', { name: choice.media ? 'Media' : 'Text' }).click();
      }
    }
  }

  await page.getByLabel('Backup password').fill(password);
  await page.getByLabel('Repeat the password').fill(password);
  await page.getByRole('button', { name: 'Make backup' }).waitFor();

  // The size estimate must be ready before the button works.
  await page.waitForFunction(() => ![...document.querySelectorAll('button')]
    .find(b => b.textContent === 'Make backup')?.disabled);

  if (cancelAfterMs !== undefined) {
    await page.getByRole('button', { name: 'Make backup' }).click();
    await page.waitForTimeout(cancelAfterMs);
    await whileRunning?.();
    await page.getByRole('alertdialog', { name: 'Making a backup' }).getByRole('button', { name: 'Cancel' }).click();

    return null;
  }

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.getByRole('button', { name: 'Make backup' }).click(),
  ]);
  const path = join(dir, file ?? `${page.context().browser().browserType().name()}-${Date.now()}.p2pchat`);

  await download.saveAs(path);
  await page.getByRole('button', { name: 'Done' }).waitFor({ timeout: 120000 });
  check(/^p2p-chat-\d{4}-\d\d-\d\d_\d\d-\d\d\.p2pchat$/.test(download.suggestedFilename()), `file name ${download.suggestedFilename()}`);
  await page.getByRole('button', { name: 'Done' }).click();
  await closeDialogs(page);

  return path;
};

// Restores a backup through the dialog. `protection` on the setup screen; `skip`: chat names; `clash`: answer.
// Returns the error shown, or null.
const importBackup = async (page, path, options = {}) => {
  const { password, protection, passphrase, skip = [], media, clash, perClash } = options;

  if (protection) {
    await page.getByRole('button', { name: 'Restore from a backup file' }).click();
  } else {
    await openSettings(page);
    await page.getByRole('button', { name: 'Restore' }).click();
  }

  const dialog = page.getByRole('dialog', { name: 'Restore a backup' });

  await dialog.locator('input[type=file]').setInputFiles(path);

  const error = dialog.locator('p').filter({ hasText: /not a P2P Chat backup|damaged|Wrong password|newer/ });

  await Promise.race([
    dialog.getByLabel('Backup password').waitFor({ timeout: 10000 }),
    error.waitFor({ timeout: 10000 }),
  ]);

  if (await error.isVisible()) {
    return error.textContent();
  }

  await dialog.getByLabel('Backup password').fill(password);
  await dialog.getByRole('button', { name: 'Open' }).click();
  await Promise.race([
    dialog.getByRole('checkbox').first().waitFor({ timeout: 30000 }),
    error.waitFor({ timeout: 30000 }),
  ]);

  if (await error.isVisible()) {
    return error.textContent();
  }

  for (const name of skip) {
    await dialog.getByRole('checkbox', { name }).uncheck();
  }

  if (media === false) {
    await dialog.getByRole('checkbox', { name: 'Restore files, voice and video messages' }).uncheck();
  }

  if (perClash) {
    await dialog.getByRole('checkbox', { name: 'Do the same for all' }).uncheck();

    for (const [name, answer] of Object.entries(perClash)) {
      await dialog.locator('div', { has: page.getByText(name, { exact: true }) })
        .filter({ has: page.getByRole('radio', { name: 'Both' }) }).last()
        .getByRole('radio', { name: answer }).click();
    }
  } else if (clash) {
    await dialog.getByRole('radio', { name: clash }).click();
  }

  if (protection) {
    await choose(dialog, protection, passphrase);
  }

  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await Promise.race([
    dialog.getByRole('button', { name: 'Done' }).waitFor({ timeout: 180000 }),
    dialog.locator('p').filter({ hasText: /stopped|damaged|space|missing/i }).waitFor({ timeout: 180000 }),
  ]);

  if (await dialog.getByRole('button', { name: 'Done' }).isVisible()) {
    await dialog.getByRole('button', { name: 'Done' }).click();
    await closeDialogs(page);

    return null;
  }

  return dialog.locator('p').filter({ hasText: /stopped|damaged|space|missing/i }).first().textContent();
};

const closeDialogs = async (page) => {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape');
  }
};

// Messages as a restore should show them: files without media say they were left out.
const withoutMedia = chats => Object.fromEntries(Object.entries(chats).map(([name, messages]) => [
  name,
  messages.map(m => (m.kind === 1 && m.status === 1
    ? { ...m, status: 2, error: 'Not in the backup (it was made without media).', hash: undefined }
    : m)),
]));

const CHATS = [
  {
    name: 'Bob',
    texts: Array.from({ length: 450 }, (_, i) => `message ${i} for Bob ✓ ünïcødé`),
    files: [
      { name: 'photo.jpg', mime: 'image/jpeg', size: 2.5 * 1024 * 1024 + 17 },
      { name: 'notes.txt', mime: 'text/plain', size: 3 * 1024 * 1024 },
      { name: 'voice.webm', mime: 'audio/webm', size: 40000, note: { type: 0, duration: 3000, wave: [1, 5, 9] } },
      { name: 'empty.bin', mime: 'application/octet-stream', size: 0 },
    ],
  },
  { name: 'Carol', texts: ['hi Carol', 'hi!'], files: [{ name: 'clip.mp4', mime: 'video/mp4', size: 700000 }] },
  { name: 'Dave', texts: [] },
];

// 1. Saved chats survive a reload, and a full backup restores on a new device, in every engine.
const roundTrip = async (engine) => {
  const a = await device(engine);

  await create(a.page);
  await seed(a.page, CHATS);

  const before = await snapshot(a.page);

  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();

  const reloaded = await snapshot(a.page);

  check(same(reloaded, before), `[${engine}] chats, files and unread counts survive a reload`);

  const readable = Object.values(before.chats).flat().filter(m => m.hash && !m.hash.startsWith('error'));

  check(readable.length === 5, `[${engine}] every file reads back`);

  const full = await exportBackup(a.page, { password: 'correct horse battery staple' });
  const textOnly = await exportBackup(a.page, { password: 'pw2 pw2 pw2 pw2 pw2', media: false });
  const partial = await exportBackup(a.page, {
    password: 'pw3 pw3 pw3 pw3 pw3',
    perChat: { Carol: { media: false }, Dave: { include: false } },
  });

  check(!(await snapshot(a.page)).paused, `[${engine}] back online after the backups`);

  const fullSize = statSync(full).size;

  // 3.24 MB of random files, and a 3 MB text file that zips to almost nothing.
  const MB = 1024 * 1024;

  check(fullSize > 3.2 * MB && fullSize < 3.5 * MB, `[${engine}] full backup, text zipped: ${fullSize}`);
  check(statSync(textOnly).size < 60000, `[${engine}] text-only backup is small: ${statSync(textOnly).size}`);

  // New device, every protection.
  const b = await device(engine);

  check(await importBackup(b.page, full, { password: 'correct horse battery staple', protection: 'No protection' })
    === null, `[${engine}] full backup restores on a new device`);

  const restored = await snapshot(b.page);

  check(same(restored.contacts, before.contacts), `[${engine}] contacts and our keys restored`);
  check(same(restored.chats, before.chats), `[${engine}] messages and files restored byte for byte`);

  await b.page.reload();
  await b.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(same((await snapshot(b.page)).chats, before.chats), `[${engine}] restored chats survive a reload`);

  const c = await device(engine);

  const temporary = await importBackup(c.page, textOnly, { password: 'pw2 pw2 pw2 pw2 pw2', protection: 'Temporary' });

  check(temporary === null, `[${engine}] text-only backup restores into a temporary identity`);
  check(same((await snapshot(c.page)).chats, withoutMedia(before.chats)), `[${engine}] text only: files say left out`);

  const d = await device(engine);

  check(await importBackup(d.page, partial, {
    password: 'pw3 pw3 pw3 pw3 pw3',
    protection: 'Passphrase',
    passphrase: 'restore pass phrase words five',
  }) === null, `[${engine}] per-chat backup restores with a passphrase`);

  const part = await snapshot(d.page);

  check(same(Object.keys(part.chats), ['Bob', 'Carol']), `[${engine}] a chat left out of the backup stays out`);
  check(same(part.chats.Bob, before.chats.Bob), `[${engine}] Bob with media`);
  check(same(part.chats.Carol, withoutMedia({ Carol: before.chats.Carol }).Carol), `[${engine}] Carol without media`);

  // The passphrase protects it after a reload.
  await d.page.reload();
  await d.page.getByLabel('Passphrase').fill('restore pass phrase words five');
  await d.page.getByRole('button', { name: 'Unlock' }).click();
  await d.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(same((await snapshot(d.page)).chats.Bob, before.chats.Bob), `[${engine}] unlocks with the new passphrase`);

  return { a, before, full };
};

// 2. Errors change nothing.
const errors = async ({ a, before, full }) => {
  const { engine, page } = a;
  const random = join(dir, 'random.p2pchat');
  const cut = join(dir, `cut-${engine}.p2pchat`);
  const flipped = join(dir, `flipped-${engine}.p2pchat`);
  const bytes = readFileSync(full);

  writeFileSync(random, Buffer.from('this is not a backup at all'));
  writeFileSync(cut, bytes.subarray(0, Math.floor(bytes.length * 0.7)));

  const changed = Buffer.from(bytes);

  changed[Math.floor(changed.length / 2)] ^= 1;
  writeFileSync(flipped, changed);

  check(/not a P2P Chat backup/.test(await importBackup(page, random, { password: 'x' }) ?? ''), `[${engine}] a file that isn't a backup is refused`);
  await closeDialogs(page);
  check(/Wrong password/.test(await importBackup(page, full, { password: 'wrong password' }) ?? ''), `[${engine}] a wrong password is refused`);
  await closeDialogs(page);
  check(/damaged/.test(await importBackup(page, cut, { password: 'correct horse battery staple' }) ?? ''), `[${engine}] a cut-off backup is refused`);
  await closeDialogs(page);
  check(/damaged/.test(await importBackup(page, flipped, { password: 'correct horse battery staple' }) ?? ''), `[${engine}] a changed byte is noticed`);
  await closeDialogs(page);

  const after = await snapshot(page);

  check(same(after.chats, before.chats) && !after.paused, `[${engine}] after failed restores nothing changed`);
};

// 3. Restoring into a device that has chats: same entry replaced, name clashes answered.
const clashes = async ({ engine, full, before }) => {
  for (const [answer, expect] of [
    ['This device\'s', { names: ['Bob', 'Carol', 'Dave'], bobFromBackup: false }],
    ['Backup\'s', { names: ['Bob', 'Carol', 'Dave'], bobFromBackup: true }],
    ['Both', { names: ['Bob', 'Bob', 'Carol', 'Dave'], bobFromBackup: true }],
  ]) {
    const e = await device(engine);

    await create(e.page);
    await seed(e.page, [{ name: 'Bob', texts: ['a different Bob'] }]);

    const restored = await importBackup(e.page, full, { password: 'correct horse battery staple', clash: answer });

    check(restored === null, `[${engine}] restore with a name clash, answer "${answer}"`);

    const got = await snapshot(e.page);
    const names = got.contacts.map(c => c.name);
    const backupBob = got.contacts.some(c => c.id === before.contacts[0].id);

    const ok = same(names, expect.names) && backupBob === expect.bobFromBackup;

    check(ok, `[${engine}] "${answer}": contacts ${names.join(', ')}`);
  }

  // Answering each clash on its own.
  const f = await device(engine);

  await create(f.page);
  await seed(f.page, [{ name: 'Bob', texts: ['other Bob'] }, { name: 'Carol', texts: ['other Carol'] }]);
  await importBackup(f.page, full, {
    password: 'correct horse battery staple',
    perClash: { Bob: 'This device\'s', Carol: 'Backup\'s' },
  });

  const each = await snapshot(f.page);

  check(same(each.contacts.map(c => c.name), ['Bob', 'Carol', 'Dave'])
    && same(each.chats.Bob.map(m => m.text), ['other Bob'])
    && same(each.chats.Carol, before.chats.Carol), `[${engine}] each clash answered on its own`);

  // Restoring the same backup again replaces the same chats (no duplicates), keeping a chat that is only here.
  const g = await device(engine);

  await create(g.page);

  const into = await importBackup(g.page, full, { password: 'correct horse battery staple' });

  check(into === null, `[${engine}] restore into an existing device`);
  await seed(g.page, [{ name: 'Erin', texts: ['only on this device'] }]);
  await importBackup(g.page, full, { password: 'correct horse battery staple' });

  const again = await snapshot(g.page);

  check(same(again.contacts.map(c => c.name), ['Bob', 'Carol', 'Dave', 'Erin'])
    && same(again.chats.Bob, before.chats.Bob), `[${engine}] restoring twice replaces, keeps others`);

  // Skipping a chat at restore.
  const h = await device(engine);

  await importBackup(h.page, full, {
    password: 'correct horse battery staple',
    protection: 'No protection',
    skip: ['Carol'],
    media: false,
  });

  const names = (await snapshot(h.page)).contacts.map(c => c.name);

  check(same(names, ['Bob', 'Dave']), `[${engine}] a chat unchecked at restore is left out`);
};

// 4. Protection changes keep chats and files; one tab at a time; a file cut off by a reload; saving fails loudly.
const device2 = async (engine) => {
  const a = await device(engine);

  await create(a.page);
  await seed(a.page, [CHATS[0]]);

  const before = await snapshot(a.page);

  const change = async (protection, passphrase) => {
    await openSettings(a.page);
    await a.page.getByRole('button', { name: 'Change protection' }).click();
    await choose(a.page, protection, passphrase);
    await a.page.getByRole('button', { name: 'Switch' }).click();

    // Going temporary asks first, in the app's own window: it deletes the saved copy.
    if (protection === 'Temporary') {
      await a.page.getByRole('alertdialog', { name: 'Switch to temporary?' })
        .getByRole('button', { name: 'Switch' })
        .click();
    }

    await a.page.getByRole('heading', { name: 'Chats and backup' }).waitFor();
    await closeDialogs(a.page);
  };

  await change('Passphrase', 'one two three four five');
  await a.page.reload();
  await a.page.getByLabel('Passphrase').fill('one two three four five');
  await a.page.getByRole('button', { name: 'Unlock' }).click();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(same((await snapshot(a.page)).chats, before.chats), `[${engine}] no protection → passphrase keeps everything`);

  await change('Temporary');
  check(same((await snapshot(a.page)).chats, before.chats), `[${engine}] → temporary keeps everything in memory`);
  await change('No protection');
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(same((await snapshot(a.page)).chats, before.chats), `[${engine}] temporary → no protection saves it again`);

  // A second tab waits until the first closes.
  const second = await a.context.newPage();

  await second.goto(URL);
  await second.getByText('Open in another tab').waitFor();
  check(true, `[${engine}] a second tab waits`);
  await a.page.close();
  await second.getByRole('button', { name: 'Settings' }).waitFor({ timeout: 15000 });
  check(same((await snapshot(second)).chats, before.chats), `[${engine}] it opens once the first tab closes`);

  // A file still arriving when the app closes is marked as stopped.
  await second.evaluate(async () => {
    const { store } = await import('/web-rtc-chat/src/store/store.ts');
    const chat = await import('/web-rtc-chat/src/store/chat/chatSlice.ts');
    const { historySaver } = await import('/web-rtc-chat/src/core/history/historySaver.ts');
    const key = store.getState().contacts.list[0].id;

    const file = { id: 'p.half', from: 'peer', name: 'half.bin', size: 5e6, mime: '', url: null, transferred: 1 };

    file.status = 0;

    store.dispatch(chat.fileAdded({ key, file }));
    await historySaver.flush();
  });
  await second.reload();
  await second.getByRole('button', { name: 'Settings' }).waitFor();

  const half = (await snapshot(second)).chats.Bob.at(-1);

  check(half.status === 2 && half.error === 'Stopped: the app was closed.', `[${engine}] a cut-off transfer says so`);

  // A full device: the chat says once that it wasn't saved.
  const notes = await second.evaluate(async () => {
    const { kv } = await import('/web-rtc-chat/src/core/storage/kv.ts');
    const { store } = await import('/web-rtc-chat/src/store/store.ts');
    const chat = await import('/web-rtc-chat/src/store/chat/chatSlice.ts');
    const batch = kv.batch;
    const key = store.getState().contacts.list[0].id;

    kv.batch = () => Promise.reject(new DOMException('full', 'QuotaExceededError'));
    store.dispatch(chat.messageQueued({ key, id: 'q1', text: 'no room' }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    store.dispatch(chat.messageQueued({ key, id: 'q2', text: 'still no room' }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    kv.batch = batch;

    return store.getState().chat.conversations[key].filter(m => m.text?.startsWith('Not saved')).length;
  });

  check(notes === 1, `[${engine}] a full device is reported once (${notes})`);
};

// 5. Cancelling a backup; a big backup streams to disk without filling the memory (Chromium).
// A new Chromium device with its profile on disk: throwaway profiles get too little storage for a big backup.
const diskDevice = async () => {
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'e2e-backup-profile-')), {
    acceptDownloads: true,
  });
  const page = await context.newPage();

  browsers.push(context);
  await page.goto(URL);
  await page.getByRole('button', { name: 'Create my identity' }).waitFor();

  return { engine: 'chromium', context, page };
};

// Memory (bytes) of all Chromium processes now.
const chromiumMemory = () => Number(execSync('ps -eo rss,comm | grep -i chrom | awk \'{s+=$1} END {print s}\'')
  .toString()) * 1024;

// How much more memory than before all Chromium processes used at most while `run` ran.
const peakMemory = async (run) => {
  const before = chromiumMemory();
  let peak = before;

  const timer = setInterval(() => {
    peak = Math.max(peak, chromiumMemory());
  }, 200);

  try {
    return { result: await run(), growth: peak - before };
  } finally {
    clearInterval(timer);
  }
};

const big = async () => {
  // Only this test's browsers, so the memory measured is theirs.
  await Promise.all(browsers.splice(0).map(browser => browser.close().catch(() => undefined)));

  const a = await diskDevice();
  const files = Array.from({ length: Math.ceil(BIG_MB / 256) }, (_, i) => ({
    name: `big-${i}.mp4`,
    mime: 'video/mp4',
    size: Math.min(256, BIG_MB - i * 256) * 1024 * 1024,
  }));

  await create(a.page);
  await seed(a.page, [{ name: 'Big', texts: ['big files'], files }]);
  // From now on the files come from storage, not from memory.
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();

  await exportBackup(a.page, { password: 'cancel me now please', cancelAfterMs: 1500, whileRunning: async () => {
    const state = await a.page.evaluate(async () => {
      const { store } = await import('/web-rtc-chat/src/store/store.ts');
      const { relayStatus } = await import('/web-rtc-chat/src/core/nostr/relayStatus.ts');
      const { connectContact } = await import('/web-rtc-chat/src/store/thunks/contact/connectContact.ts');
      const { sessions } = await import('/web-rtc-chat/src/core/webrtc/state.ts');
      const key = store.getState().contacts.list[0].id;

      await store.dispatch(connectContact(key));

      return { paused: store.getState().app.paused, relays: relayStatus().connected, sessions: sessions.size };
    });

    const offline = state.paused && state.relays === 0 && state.sessions === 0;

    check(offline, `[chromium] offline while it runs: no relays, no connections (${JSON.stringify(state)})`);
  } });

  const stopped = await a.page.getByText(/Backup stopped/).waitFor({ timeout: 30000 }).then(() => true, () => false);

  check(stopped, '[chromium] a backup can be cancelled');
  check(!(await snapshot(a.page)).paused, '[chromium] online again after cancelling');
  await closeDialogs(a.page);

  const started = Date.now();
  const made = await peakMemory(() => exportBackup(a.page, { password: 'big backup password', file: 'big.p2pchat' }));
  const seconds = (Date.now() - started) / 1000;

  check(statSync(made.result).size > BIG_MB * 1024 * 1024, `[chromium] ${BIG_MB} MB backup made in ${seconds} s`);
  log(`memory grew by at most ${Math.round(made.growth / 1024 / 1024)} MB while making it`);
  check(made.growth < BIG_MB * 1024 * 1024 / 2, '[chromium] the backup streams to disk, not memory');

  const b = await diskDevice();
  const restored = await peakMemory(() => importBackup(b.page, made.result, {
    password: 'big backup password',
    protection: 'No protection',
  }));

  check(restored.result === null, '[chromium] the big backup restores');
  log(`memory grew by at most ${Math.round(restored.growth / 1024 / 1024)} MB while restoring it`);
  check(restored.growth < BIG_MB * 1024 * 1024 / 2, '[chromium] the restore reads the file piece by piece');
  check(same((await snapshot(b.page)).chats, (await snapshot(a.page)).chats), '[chromium] big files restored exactly');
};

try {
  const runs = {};

  for (const engine of engines) {
    log(`--- ${engine}`);
    runs[engine] = await roundTrip(engine);
    await errors(runs[engine]);
    await clashes({ engine, ...runs[engine] });
    await device2(engine);
  }

  // Across engines: each engine's backup restores in the next one.
  for (const [i, from] of engines.entries()) {
    const to = engines[(i + 1) % engines.length];

    if (to === from) {
      continue;
    }

    const target = await device(to);

    const restored = await importBackup(target.page, runs[from].full, {
      password: 'correct horse battery staple',
      protection: 'No protection',
    });

    const ok = restored === null && same((await snapshot(target.page)).chats, runs[from].before.chats);

    check(ok, `a ${from} backup restores in ${to}`);
  }

  // Without the service worker (blocked here, as in some private windows) the backup is built in memory.
  for (const engine of engines) {
    const browser = await browserFor(engine);
    const context = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block' });
    const page = await context.newPage();

    await page.goto(URL);
    await create(page);
    await seed(page, [CHATS[1]]);

    const before = await snapshot(page);
    const path = await exportBackup(page, { password: 'no worker here at all' });
    const target = await device(engine);

    check(await importBackup(target.page, path, { password: 'no worker here at all', protection: 'No protection' })
      === null && same((await snapshot(target.page)).chats, before.chats), `[${engine}] backup without service worker`);
  }

  if (engines.includes('chromium') && BIG_MB > 0) {
    await big();
  }
} catch (err) {
  failures.push(`crashed: ${err.stack}`);
  log(err.stack);
} finally {
  await Promise.all(browsers.map(browser => browser.close().catch(() => undefined)));
}

log(failures.length ? `FAILED:\n${failures.join('\n')}` : 'ALL PASSED');
process.exit(failures.length ? 1 : 0);
