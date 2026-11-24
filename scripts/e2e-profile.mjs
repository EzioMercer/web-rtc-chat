// Profiles: in Chromium, Firefox and WebKit a picture is made from an image file, a phone number is checked (mobile
// only), saved and spaced, and a description saved; the phone's country is guessed from the time zone or the
// language. Two browsers connected by hand-copied codes swap profiles by hash (the manual connection stands in for
// a contact here: each side adds a contact with its id), see changes and removals, and keep them after a reload and a
// backup restore. It reaches into the app's modules, which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-profile.mjs
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

// A new identity in a new browser. `place`: the device's time zone and language, which the phone's country is
// guessed from.
const user = async (type, name, place = { timezoneId: 'Asia/Baku', locale: 'en-US' }) => {
  const browser = await type.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, ...place });

  page.on('pageerror', err => log(`[${name} error] ${err.message}`));
  await page.goto(URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Settings' }).waitFor();

  return { browser, page };
};

const ourProfile = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');

  return store.getState().profile;
});

const ourPicture = async page => (await ourProfile(page)).picture;

// Settings, then its Profile info window (loaded when first opened).
const openProfile = async (page) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Profile info/ }).click();
  await page.getByLabel('Phone number').waitFor();
};

// Back out of the Profile info window and Settings.
const closeProfile = async (page) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Profile info/ }).waitFor();
  await page.keyboard.press('Escape');
};

// Types a phone number (digits after the country code) and a description, and saves them. Resolves with the error
// shown, if any.
const saveInfo = async (page, digits, about) => {
  await page.getByLabel('Phone number').fill('');
  await page.getByLabel('Phone number').pressSequentially(digits);
  await page.getByLabel('Description').fill(about);
  await page.getByRole('button', { name: 'Save' }).click();

  const shown = await waitFor('saved or refused', 5, async () => (
    await page.getByText('Saved.').isVisible() || await page.getByText('isn\'t a mobile number').isVisible()
  ));

  return shown && await page.getByText('isn\'t a mobile number').isVisible()
    ? await page.getByText('isn\'t a mobile number').textContent()
    : null;
};

// A photo-like test image (`width` x `height`, a gradient, so it doesn't compress to nothing) as a PNG file, set as
// our picture through the Profile info window's file input.
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

  await openProfile(page);
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({
    name: 'me.png',
    mimeType: 'image/png',
    buffer: Buffer.from(bytes),
  });
  await waitFor('picture made', 20, async () => await ourPicture(page) !== before);
  await closeProfile(page);
};

const theirProfile = page => page.evaluate(async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const contact = store.getState().contacts.list.find(c => c.id === 'manual');

  return { picture: contact?.picture ?? null, phone: contact?.phone ?? '', about: contact?.about ?? '' };
});

// No picture, phone or description.
const isEmpty = ({ picture, phone, about }) => picture === null && phone === '' && about === '';

const theirPicture = async page => (await theirProfile(page)).picture;

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

  // Back returns to Settings; the X closes both.
  await openProfile(page);
  await page.getByRole('button', { name: 'Back' }).click();
  check(await page.getByRole('button', { name: /Profile info/ }).isVisible(), `${name}: Back returns to Settings`);
  await page.getByRole('button', { name: /Profile info/ }).click();
  await page.getByLabel('Phone number').waitFor();
  await page.getByRole('button', { name: 'Close' }).click();
  check(await page.getByRole('dialog').count() === 0, `${name}: the X closes Profile info and Settings`);

  await openProfile(page);
  check(await page.locator(`img[src="${picture}"]`).count() > 0, `${name}: the Profile info window shows it`);
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

  // The phone number: the country guessed from the time zone (Baku), a landline refused, a mobile saved in the
  // international form and shown spaced; the description with its new lines, cut at 150 characters.
  check(await page.getByRole('button', { name: 'Country: Azerbaijan' }).isVisible(), `${name}: the country is guessed`);
  check(
    (await saveInfo(page, '124987654', 'x'))?.includes('Azerbaijan') ?? false,
    `${name}: a landline is refused`,
  );
  check((await ourProfile(page)).phone === '', `${name}: nothing is saved then`);
  check(await saveInfo(page, '501234567', 'Line one\nLine two') === null, `${name}: a mobile number is accepted`);
  check((await ourProfile(page)).phone === '+994501234567', `${name}: it is saved as +994501234567`);
  check(await page.getByLabel('Phone number').inputValue() === '50 123 45 67', `${name}: it is shown spaced`);
  check((await ourProfile(page)).about === 'Line one\nLine two', `${name}: the description keeps its new lines`);
  await page.getByLabel('Description').fill('y'.repeat(200));
  check((await page.getByLabel('Description').inputValue()).length === 150, `${name}: the description stops at 150`);
  await page.getByLabel('Description').fill('Line one\nLine two');

  // Pasted with its code, a number picks its own country.
  await page.getByLabel('Phone number').fill('+44 7400 123456');
  check(
    await page.getByRole('button', { name: 'Country: United Kingdom' }).isVisible()
    && await page.getByLabel('Phone number').inputValue() === '7400 123456',
    `${name}: a pasted +44 number picks the United Kingdom`,
  );

  // The country list: searched by code.
  await page.getByRole('button', { name: /Country:/ }).click();
  await page.getByLabel('Search').fill('+994');
  check(
    await page.getByRole('button', { name: /Azerbaijan/ }).isVisible()
    && await page.getByRole('button', { name: /Armenia/ }).count() === 0,
    `${name}: the country list finds +994`,
  );
  await page.getByLabel('Search').fill('kingdom');
  check(
    await page.getByRole('button', { name: /^United Kingdom/ }).isVisible()
    && await page.getByRole('button', { name: /^Jersey/ }).count() === 0,
    `${name}: the country list finds a name`,
  );
  await page.getByLabel('Search').fill('+994');
  await page.getByRole('button', { name: /Azerbaijan/ }).click();
  await page.getByLabel('Phone number').fill('501234567');
  await closeProfile(page);

  // Into a backup and out again: the backup's picture comes back only when the device has none.
  const restored = await page.evaluate(async () => {
    const { store } = await import('/web-rtc-chat/src/store/store.ts');
    const { writeBackup } = await import('/web-rtc-chat/src/core/backup/writeBackup.ts');
    const { readBackupPreview } = await import('/web-rtc-chat/src/core/backup/readBackupPreview.ts');
    const { importBackup } = await import('/web-rtc-chat/src/store/thunks/backup/importBackup.ts');
    const { infoChosen, pictureChosen } = await import('/web-rtc-chat/src/store/profile/profileSlice.ts');
    const parts = [];
    const sink = {
      write: async bytes => void parts.push(bytes.slice()),
      close: async () => undefined,
      abort: () => undefined,
    };
    const { profile } = store.getState();
    const source = { contacts: [], conversations: {}, choices: [], profile };

    await writeBackup(sink, 'test password', source, () => {}, new AbortController().signal);

    const file = new Blob(parts);

    const restore = async () => {
      const { key } = await readBackupPreview(file, 'test password');
      const plan = { include: new Set(), media: true, remove: new Set() };

      return store.dispatch(importBackup(file, key, plan, null));
    };

    store.dispatch(pictureChosen('data:image/png;base64,AAAA'));
    store.dispatch(infoChosen({ phone: '+12025550123', about: '' }));

    const keptError = await restore();
    const now = store.getState().profile;
    const kept = now.picture === 'data:image/png;base64,AAAA' && now.phone === '+12025550123' && now.about === '';

    store.dispatch(pictureChosen(null));
    store.dispatch(infoChosen({ phone: '', about: '' }));

    const backError = await restore();
    const after = store.getState().profile;
    const back = after.picture === profile.picture && after.phone === profile.phone && after.about === profile.about;

    return { kept, back, errors: [keptError, backError] };
  });

  check(restored.kept, `${name}: a restore keeps the device's own picture, phone and description`);
  check(restored.back, `${name}: a restore brings them back when the device has none`);
  check(restored.errors.every(error => error === null), `${name}: the restores worked (${restored.errors})`);
  await browser.close();
};

// The phone's country guessed from other time zones and, with none, from the language.
const testGuess = async () => {
  for (const [place, country] of [
    [{ timezoneId: 'Europe/London', locale: 'en-US' }, 'United Kingdom'],
    [{ timezoneId: 'Asia/Nicosia', locale: 'en-US' }, 'Cyprus'],
    // Named in the browser's language.
    [{ timezoneId: 'UTC', locale: 'de-DE' }, 'Deutschland'],
  ]) {
    const { browser, page } = await user(chromium, place.timezoneId, place);

    await openProfile(page);
    check(
      await page.getByRole('button', { name: `Country: ${country}` }).isVisible(),
      `${place.timezoneId}, ${place.locale}: guessed ${country}`,
    );
    await browser.close();
  }
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
  const { offerProfile } = await import('/web-rtc-chat/src/store/thunks/profile/offerProfile.ts');

  await store.dispatch(offerProfile('manual'));
});

const testSwap = async () => {
  const a = await user(chromium, 'A');
  const b = await user(chromium, 'B');

  // Saved on the device, so a reload keeps it.
  await choosePicture(a.page, 800, 1200);
  await openProfile(a.page);
  await saveInfo(a.page, '501234567', 'Hello from A');
  await closeProfile(a.page);
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
  check(
    await waitFor('B gets the phone', 10, async () => {
      const theirs = await theirProfile(b.page);

      return theirs.phone === '+994501234567' && theirs.about === 'Hello from A';
    }),
    'B gets A\'s phone and description',
  );
  check(isEmpty(await theirProfile(a.page)), 'A gets nothing from B, who has nothing');
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
  check(await a.page.evaluate(() => window.countSent()) < 200, 'the same profile again sends only its hashes');

  // A new description alone: only it goes, not the picture again.
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
  await openProfile(a.page);
  await a.page.getByLabel('Description').fill('Changed');
  await a.page.getByRole('button', { name: 'Save' }).click();
  await closeProfile(a.page);
  check(
    await waitFor('B gets the new description', 10, async () => (await theirProfile(b.page)).about === 'Changed'),
    'B gets the new description right away',
  );
  check(await a.page.evaluate(() => window.countSent()) < 1000, 'without the picture being sent again');

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
    await waitFor('B keeps it', 10, async () => {
      const theirs = await theirProfile(b.page);

      return theirs.picture === changed && theirs.phone === '+994501234567' && theirs.about === 'Changed';
    }),
    'B still has the picture, phone and description after a reload',
  );
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(
    await waitFor('A keeps it', 10, async () => {
      const ours = await ourProfile(a.page);

      return ours.picture === changed && ours.phone === '+994501234567' && ours.about === 'Changed';
    }),
    'A still has its own',
  );

  // Connected again: then A removes everything.
  await connect(a.page, b.page);
  await openProfile(a.page);
  await a.page.getByRole('button', { name: 'Remove' }).click();
  await a.page.getByLabel('Phone number').fill('');
  await a.page.getByLabel('Description').fill('');
  await a.page.getByRole('button', { name: 'Save' }).click();
  check(isEmpty(await ourProfile(a.page)), 'A removes the picture, phone and description');
  check(
    await waitFor('B loses it', 10, async () => (
      isEmpty(await theirProfile(b.page))
    )),
    'B no longer has them',
  );

  await a.browser.close();
  await b.browser.close();
};

for (const [type, name] of [[chromium, 'Chromium'], [firefox, 'Firefox'], [webkit, 'WebKit']]) {
  await testMaking(type, name);
}

await testGuess();
await testSwap();

log(failures.length ? `${failures.length} failed:\n  ${failures.join('\n  ')}` : 'All passed.');
process.exit(failures.length ? 1 : 0);
