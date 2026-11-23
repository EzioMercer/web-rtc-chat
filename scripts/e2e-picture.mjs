// Profile pictures: a picture is made from an image file in Chromium, Firefox and WebKit; two browsers connected by
// hand-copied codes swap pictures by hash (the manual connection stands in for a contact here: each side adds a
// contact with its id), see a new one and a removed one, and keep both after a reload. It reaches into the app's
// modules, which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-picture.mjs
import { chromium, firefox, webkit } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
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

const user = async (type, name) => {
  const browser = await type.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });

  page.on('pageerror', err => log(`[${name} error] ${err.message}`));
  await page.goto(URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Settings' }).waitFor();

  return { browser, page };
};

const ourPicture = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');

  return store.getState().profile.picture;
});

// A photo-like test image (`width` x `height`, a gradient, so it doesn't compress to nothing) as a PNG file, set as
// our picture through the Settings dialog's file input. Resolves with the error shown, if any.
const choosePicture = async (page, width, height) => {
  const bytes = await page.evaluate(async ([w, h]) => {
    const canvas = document.createElement('canvas');

    canvas.width = w;
    canvas.height = h;

    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, w, h);

    gradient.addColorStop(0, '#e33');
    gradient.addColorStop(1, '#33e');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);

    for (let i = 0; i < 400; i += 1) {
      context.fillStyle = `hsl(${i * 37 % 360} 80% 50%)`;
      context.fillRect(Math.random() * w, Math.random() * h, w / 20, h / 20);
    }

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    return [...new Uint8Array(await blob.arrayBuffer())];
  }, [width, height]);

  const before = await ourPicture(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({
    name: 'me.png',
    mimeType: 'image/png',
    buffer: Buffer.from(bytes),
  });
  await waitFor('picture made', 20, async () => await ourPicture(page) !== before);
  await page.keyboard.press('Escape');
};

const theirPicture = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');

  return store.getState().contacts.list.find(c => c.id === 'manual')?.picture ?? null;
});

// The size of a data URL's picture, as the browser decodes it.
const pictureSize = (page, picture) => page.evaluate(async (src) => {
  const image = new Image();

  image.src = src;
  await image.decode();

  return `${image.naturalWidth}x${image.naturalHeight}`;
}, picture);

const testMaking = async (type, name) => {
  const { browser, page } = await user(type, name);

  await choosePicture(page, 3000, 2000);

  const picture = await ourPicture(page);

  check(Boolean(picture?.startsWith('data:image/jpeg;base64,')), `${name}: a JPEG picture is made from a big photo`);

  if (picture) {
    check(await pictureSize(page, picture) === '256x256', `${name}: it is a 256 px square`);
    check(picture.length <= 64_000, `${name}: it fits in one message (${picture.length} chars)`);
  }

  await page.getByRole('button', { name: 'Settings' }).click();
  check(await page.locator(`img[src="${picture}"]`).count() > 0, `${name}: Settings shows it`);
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({
    name: 'not.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a picture'),
  });
  check(
    await waitFor('error', 5, () => page.getByText('isn\'t a picture').isVisible()),
    `${name}: a file that isn't a picture is refused`,
  );
  check(await ourPicture(page) === picture, `${name}: the old picture stays after that`);

  // Into a backup and out again: the backup's picture comes back only when the device has none.
  const restored = await page.evaluate(async () => {
    const { store } = await import('/web-rtc-chat/src/store/store.ts');
    const { writeBackup } = await import('/web-rtc-chat/src/core/backup/writeBackup.ts');
    const { readBackupPreview } = await import('/web-rtc-chat/src/core/backup/readBackupPreview.ts');
    const { importBackup } = await import('/web-rtc-chat/src/store/thunks/backup/importBackup.ts');
    const { pictureChosen } = await import('/web-rtc-chat/src/store/profile/profileSlice.ts');
    const parts = [];
    const sink = {
      write: async bytes => void parts.push(bytes.slice()),
      close: async () => undefined,
      abort: () => undefined,
    };
    const { profile } = store.getState();
    const source = { contacts: [], conversations: {}, choices: [], picture: profile.picture };

    await writeBackup(sink, 'test password', source, () => {}, new AbortController().signal);

    const file = new Blob(parts);

    const restore = async () => {
      const { key } = await readBackupPreview(file, 'test password');
      const plan = { include: new Set(), media: true, remove: new Set() };

      return store.dispatch(importBackup(file, key, plan, null));
    };

    store.dispatch(pictureChosen('data:image/png;base64,AAAA'));

    const keptError = await restore();
    const kept = store.getState().profile.picture === 'data:image/png;base64,AAAA';

    store.dispatch(pictureChosen(null));

    const backError = await restore();

    return { kept, back: store.getState().profile.picture === profile.picture, errors: [keptError, backError] };
  });

  check(restored.kept, `${name}: a restore keeps the device's own picture`);
  check(restored.back, `${name}: a restore brings the picture back when the device has none`);
  check(restored.errors.every(error => error === null), `${name}: the restores worked (${restored.errors})`);
  await browser.close();
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
};

// Each side adds a contact with the manual connection's id, so the picture swap (contacts only) runs over it, and
// tells the other side its picture as a newly opened connection would.
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
  }));
});

const offer = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { offerPicture } = await import('/web-rtc-chat/src/store/thunks/profile/offerPicture.ts');

  await store.dispatch(offerPicture('manual'));
});

const testSwap = async () => {
  const a = await user(chromium, 'A');
  const b = await user(chromium, 'B');

  // Saved on the device, so a reload keeps it.
  await choosePicture(a.page, 800, 1200);
  await connect(a.page, b.page);
  await pretendContact(a.page);
  await pretendContact(b.page);
  await offer(a.page);
  await offer(b.page);

  const mine = await ourPicture(a.page);

  check(
    await waitFor('B gets the picture', 10, async () => await theirPicture(b.page) === mine),
    'B gets A\'s picture',
  );
  check(await theirPicture(a.page) === null, 'A gets none from B, who has none');
  check(
    await waitFor('row', 5, async () => await b.page.locator(`img[src="${mine}"]`).count() > 0),
    'B shows it in the contact list',
  );

  // Asked by hash: a second offer of the same picture sends nothing more.
  await a.page.evaluate(async () => {
    const { sessions } = await import('/web-rtc-chat/src/core/webrtc/state.ts');
    const channel = sessions.get('manual').channel;
    const original = channel.send.bind(channel);
    let bytes = 0;

    channel.send = (data) => {
      bytes += String(data).length;
      original(data);
    };
    window.countSent = () => bytes;
  });

  await offer(a.page);
  await new Promise(resolve => setTimeout(resolve, 1500));
  check(await a.page.evaluate(() => window.countSent()) < 200, 'the same picture again sends only its hash');

  await choosePicture(a.page, 600, 600);

  const changed = await ourPicture(a.page);

  check(changed !== mine, 'A chooses another picture');
  check(
    await waitFor('B gets the new picture', 10, async () => await theirPicture(b.page) === changed),
    'B gets the new one right away',
  );

  await b.page.reload();
  await b.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(
    await waitFor('B keeps it', 10, async () => await theirPicture(b.page) === changed),
    'B still has it after a reload',
  );
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(await waitFor('A keeps it', 10, async () => await ourPicture(a.page) === changed), 'A still has its own');

  // Connected again: then A removes it.
  await connect(a.page, b.page);
  await a.page.getByRole('button', { name: 'Settings' }).click();
  await a.page.getByRole('button', { name: 'Remove' }).click();
  check(await ourPicture(a.page) === null, 'A removes the picture');
  check(
    await waitFor('B loses it', 10, async () => await theirPicture(b.page) === null),
    'B no longer has it',
  );

  await a.browser.close();
  await b.browser.close();
};

for (const [type, name] of [[chromium, 'Chromium'], [firefox, 'Firefox'], [webkit, 'WebKit']]) {
  await testMaking(type, name);
}

await testSwap();

log(failures.length ? `${failures.length} failed:\n  ${failures.join('\n  ')}` : 'All passed.');
process.exit(failures.length ? 1 : 0);
