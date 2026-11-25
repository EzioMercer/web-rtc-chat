// Profiles: in Chromium, Firefox and WebKit a picture is made from an image file, a phone number is checked (mobile
// only), saved and spaced, a description and a birthday (with or without the year) saved; the phone's country is
// guessed from the time zone or the language. Two browsers connected by hand-copied codes swap profiles by hash (the
// manual connection stands in for a contact here: each side adds a contact with its id), see changes and removals,
// and keep them after a reload and a backup restore. It reaches into the app's modules, which only the dev server
// serves, so run it against that:
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

// Types a phone number (digits after the country code) and a description, and saves them. The number is checked as
// it is typed: when it can't be saved, Save is off and this resolves with the note shown.
const saveInfo = async (page, digits, about) => {
  await page.getByLabel('Phone number').fill('');
  await page.getByLabel('Phone number').pressSequentially(digits);
  await page.getByLabel('Description').fill(about);

  const note = page.locator('p', { hasText: /mobile number|country of your phone/ });

  if (await note.isVisible()) {
    return await page.getByRole('button', { name: 'Save' }).isDisabled() ? await note.textContent() : 'Save is on';
  }

  await page.getByRole('button', { name: 'Save' }).click();
  await waitFor('saved', 5, () => page.getByText('Saved.').isVisible());

  return null;
};

// Types and chooses a birthday (the day and year typed, the month's number chosen; '' for none) and saves it. It is
// checked as it is entered: when it can't be saved, Save is off and this resolves with the note shown.
const saveBirthday = async (page, day, month, year) => {
  await page.getByLabel('Day', { exact: true }).fill(day);
  await page.getByLabel('Month', { exact: true }).selectOption(month);
  await page.getByLabel('Year', { exact: true }).fill(year);

  const note = page.locator('p', { hasText: /birthday|year|no such date|hasn't come/ });

  if (await note.isVisible()) {
    return await page.getByRole('button', { name: 'Save' }).isDisabled() ? await note.textContent() : 'Save is on';
  }

  await page.getByRole('button', { name: 'Save' }).click();
  await waitFor('saved', 5, () => page.getByText('Saved.').isVisible());

  return null;
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

  return {
    picture: contact?.picture ?? null,
    phone: contact?.phone ?? '',
    about: contact?.about ?? '',
    birthday: contact?.birthday ?? '',
  };
});

// No picture, phone, description or birthday.
const isEmpty = ({ picture, phone, about, birthday }) => (
  picture === null && phone === '' && about === '' && birthday === ''
);

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
  check(
    (await saveInfo(page, '50123', 'x'))?.includes('whole mobile number') ?? false,
    `${name}: a number not typed to its end isn't taken`,
  );

  // A number stops at the most digits a mobile number of its country has (with or without the leading 0).
  await page.getByLabel('Phone number').fill('');
  await page.getByLabel('Phone number').pressSequentially('5555555555555');
  check(
    await page.getByLabel('Phone number').inputValue() === '55 555 55 55',
    `${name}: an Azerbaijani number stops at 9 digits`,
  );
  await page.getByLabel('Phone number').fill('');
  await page.getByLabel('Phone number').pressSequentially('050123456789');
  check(
    (await page.getByLabel('Phone number').inputValue()).replace(/\D/g, '') === '0501234567',
    `${name}: and at 10 with its leading 0`,
  );
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

  // Save waits while a picture is being made.
  await page.getByLabel('Description').fill('Waiting for the picture');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({
    name: 'big.png',
    mimeType: 'image/png',
    buffer: await page.evaluate(async () => {
      const canvas = document.createElement('canvas');

      canvas.width = 4000;
      canvas.height = 3000;
      canvas.getContext('2d').fillRect(0, 0, 4000, 3000);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      return [...new Uint8Array(await blob.arrayBuffer())];
    }).then(bytes => Buffer.from(bytes)),
  });
  check(
    await page.getByRole('button', { name: 'Save' }).isDisabled(),
    `${name}: Save is off while the picture is being made`,
  );
  check(
    await waitFor('picture made', 20, () => page.getByRole('button', { name: 'Save' }).isEnabled()),
    `${name}: and on again once it is made`,
  );
  await page.getByLabel('Description').fill('Line one\nLine two');

  // The birthday: a day and month are needed, the year is optional; 29 February only in a leap year.
  check(
    (await saveBirthday(page, '12', '', ''))?.includes('choose the month') ?? false,
    `${name}: a birthday without its month is refused`,
  );
  check(
    (await saveBirthday(page, '29', '2', '2023')) === 'There is no such date.',
    `${name}: 29 February 2023 is refused`,
  );
  check(
    (await saveBirthday(page, '1', '1', '1850'))?.includes('from 1900') ?? false,
    `${name}: a year before 1900 is refused`,
  );
  check(
    (await saveBirthday(page, '0', '1', ''))?.includes('no such date') ?? false,
    `${name}: day 0 is refused`,
  );
  check(
    (await saveBirthday(page, '32', '1', ''))?.includes('no such date') ?? false,
    `${name}: day 32 is refused`,
  );
  await page.getByLabel('Day', { exact: true }).fill('1a2b3');
  check(await page.getByLabel('Day', { exact: true }).inputValue() === '12', `${name}: the day takes 2 digits only`);
  check(
    (await saveBirthday(page, '1', '1', '199'))?.includes('4 digits') ?? false,
    `${name}: a year of 3 digits isn't taken`,
  );
  check(
    (await saveBirthday(page, '1', '1', String(new Date().getFullYear() + 1)))?.includes('from 1900') ?? false,
    `${name}: next year is refused`,
  );

  // Two days on: the page's time zone (Baku) can already be a day ahead of this script's.
  const tomorrow = new Date(Date.now() + 2 * 86_400_000);

  if (tomorrow.getFullYear() === new Date().getFullYear()) {
    check(
      (await saveBirthday(
        page,
        String(tomorrow.getDate()),
        String(tomorrow.getMonth() + 1),
        String(tomorrow.getFullYear()),
      )) === 'This day hasn\'t come yet.',
      `${name}: a day still to come this year is refused`,
    );
  }

  await page.getByLabel('Year', { exact: true }).fill('19a8');
  check(
    await page.getByLabel('Year', { exact: true }).inputValue() === '198',
    `${name}: the year takes digits only`,
  );
  check((await ourProfile(page)).birthday === '', `${name}: no birthday is saved then`);
  check(await saveBirthday(page, '09', '3', '') === null, `${name}: a day typed with its 0 is accepted`);
  check((await ourProfile(page)).birthday === '--03-09', `${name}: it is saved as --03-09`);
  check(await page.getByLabel('Day', { exact: true }).inputValue() === '9', `${name}: and then shown as 9`);
  check(await saveBirthday(page, '29', '2', '') === null, `${name}: 29 February without a year is accepted`);
  check((await ourProfile(page)).birthday === '--02-29', `${name}: it is saved as --02-29`);
  check(await saveBirthday(page, '29', '2', '2000') === null, `${name}: 29 February 2000 is accepted`);
  check((await ourProfile(page)).birthday === '2000-02-29', `${name}: it is saved as 2000-02-29`);
  check((await ourProfile(page)).phone === '+994501234567', `${name}: the phone stays saved with it`);
  await closeProfile(page);
  await openProfile(page);
  check(
    await page.getByLabel('Day', { exact: true }).inputValue() === '29'
    && await page.getByLabel('Month', { exact: true }).inputValue() === '2'
    && await page.getByLabel('Year', { exact: true }).inputValue() === '2000',
    `${name}: the saved birthday is shown when the window opens again`,
  );
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
    store.dispatch(infoChosen({ phone: '+12025550123', about: '', birthday: '' }));

    const keptError = await restore();
    const now = store.getState().profile;
    const kept = now.picture === 'data:image/png;base64,AAAA' && now.phone === '+12025550123' && now.about === ''
      && now.birthday === '';

    store.dispatch(pictureChosen(null));
    store.dispatch(infoChosen({ phone: '', about: '', birthday: '' }));

    const backError = await restore();
    const after = store.getState().profile;
    const back = after.picture === profile.picture && after.phone === profile.phone && after.about === profile.about
      && after.birthday === profile.birthday && profile.birthday === '2000-02-29';

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
    lastConnected: null,
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
  await saveBirthday(a.page, '7', '11', '');
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

      return theirs.phone === '+994501234567' && theirs.about === 'Hello from A' && theirs.birthday === '--11-07';
    }),
    'B gets A\'s phone, description and birthday',
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
  await openProfile(a.page);
  await saveBirthday(a.page, '7', '11', '1990');
  await closeProfile(a.page);
  check(
    await waitFor('B gets the year', 10, async () => (await theirProfile(b.page)).birthday === '1990-11-07'),
    'B gets the birthday\'s year once A adds it',
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

      return theirs.picture === changed && theirs.phone === '+994501234567' && theirs.about === 'Changed'
        && theirs.birthday === '1990-11-07';
    }),
    'B still has the picture, phone, description and birthday after a reload',
  );
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Settings' }).waitFor();
  check(
    await waitFor('A keeps it', 10, async () => {
      const ours = await ourProfile(a.page);

      return ours.picture === changed && ours.phone === '+994501234567' && ours.about === 'Changed'
        && ours.birthday === '1990-11-07';
    }),
    'A still has its own',
  );

  // Connected again: then A removes everything.
  await connect(a.page, b.page);
  await openProfile(a.page);
  await a.page.getByRole('button', { name: 'Remove' }).click();
  await a.page.getByLabel('Phone number').fill('');
  await a.page.getByLabel('Description').fill('');
  await saveBirthday(a.page, '', '', '');
  check(isEmpty(await ourProfile(a.page)), 'A removes the picture, phone, description and birthday');
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
