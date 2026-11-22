// Two browsers connect by hand-copied codes (no relays) and test what is hard to check by hand: voice and video
// messages, the TURN file limit, and echo detection with the echo guard. It reaches into the app's modules, which
// only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-media.mjs
// Uses the preinstalled Playwright Chromium with a fake camera, and a generated speech-like sound as the microphone.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
const dir = mkdtempSync(join(tmpdir(), 'e2e-media-'));
const failures = [];

const log = message => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const check = (ok, what) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${what}`);

  if (!ok) {
    failures.push(what);
  }
};

// 60 s of "syllables" (tone bursts of random pitch and length) and pauses: speech-like, and different per seed, so
// two people don't look alike to the echo detector the way two identical beeps would.
const speechWav = (seed) => {
  let state = seed;

  const random = (min, max) => {
    state = (state * 1103515245 + 12345) % 2147483648;

    return min + (state / 2147483648) * (max - min);
  };

  const rate = 48000;
  const samples = [];

  while (samples.length < 60 * rate) {
    for (let word = Math.floor(random(2, 8)); word > 0; word -= 1) {
      const length = Math.floor(random(0.1, 0.4) * rate);
      const pitch = random(100, 280);
      const loud = random(0.2, 0.6);

      for (let i = 0; i < length; i += 1) {
        const phase = (2 * Math.PI * pitch * i) / rate;
        const tone = 0.7 * Math.sin(phase) + 0.3 * Math.sin(2.2 * phase);

        samples.push(loud * Math.sin((Math.PI * i) / length) * tone);
      }

      samples.push(...new Array(Math.floor(random(0.03, 0.15) * rate)).fill(0));
    }

    samples.push(...new Array(Math.floor(random(0.5, 2.5) * rate)).fill(0));
  }

  const data = Buffer.alloc(60 * rate * 2);

  for (let i = 0; i < 60 * rate; i += 1) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  }

  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  const path = join(dir, `voice-${seed}.wav`);

  writeFileSync(path, Buffer.concat([header, data]));

  return path;
};

const user = async (name, wav) => {
  const browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${wav}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const context = await browser.newContext({
    permissions: ['microphone', 'camera'],
    viewport: { width: 420, height: 800 },
  });
  const page = await context.newPage();

  page.on('pageerror', err => log(`[${name} error] ${err.message}`));
  await page.goto(URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Connect manually' }).click();

  return { browser, page };
};

const connect = async (a, b) => {
  const code = page => page.waitForFunction(() => document.querySelectorAll('textarea')[1]?.value.length > 10)
    .then(() => page.locator('textarea').nth(1).inputValue());

  await a.getByRole('button', { name: 'Host' }).click();
  await b.locator('textarea').first().fill(await code(a));
  await b.getByRole('button', { name: 'Join' }).click();
  await a.locator('textarea').first().fill(await code(b));
  await a.getByRole('button', { name: 'Connect' }).click();
  await a.getByText('Connected. Say hi!').waitFor({ timeout: 30000 });
};

// The app's modules, from inside the page (the dev server serves each source file at its path).
const app = (page, fn, arg) => page.evaluate(fn, arg);

const setRoute = (page, route) => app(page, async (r) => {
  const { sessions } = await import('/web-rtc-chat/src/core/webrtc/state.ts');

  sessions.forEach((session) => {
    session.route = r;
  });
}, route);

const holdRecord = async (page, ms, slide) => {
  const box = await page.locator('button[aria-label*="hold to record"]').boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(ms);

  if (slide) {
    await page.mouse.move(x + slide.x, y + slide.y, { steps: 8 });
  }

  await page.mouse.up();
};

const testMessages = async (a, b) => {
  const button = a.locator('button[aria-label*="hold to record"]');

  await button.click();
  check((await button.getAttribute('aria-label')).startsWith('Video'), 'a tap switches to video');
  await button.click();

  await holdRecord(a, 2000);
  await b.getByRole('button', { name: 'Play voice message' }).waitFor({ timeout: 15000 });
  check(true, 'a held voice message arrives');

  await holdRecord(a, 1200, { x: -140, y: 0 });
  await a.waitForTimeout(800);
  check(await a.getByRole('button', { name: 'Play voice message' }).count() === 1, 'sliding left cancels');

  await button.click();
  await a.waitForTimeout(2700);
  await holdRecord(a, 2500);
  await b.getByRole('button', { name: 'Play video message' }).waitFor({ timeout: 20000 });
  await b.waitForTimeout(1500);

  const size = await b.evaluate(() => {
    const video = document.querySelector('video[src^="blob:"]');

    return video ? `${video.videoWidth}x${video.videoHeight}` : 'none';
  });

  check(size === '384x384', `a round video message arrives, square (${size})`);
};

const testRelayLimit = async (a, b) => {
  const big = join(dir, 'big.bin');
  const small = join(dir, 'small.bin');

  writeFileSync(big, Buffer.alloc(11 * 1024 * 1024, 1));
  writeFileSync(small, Buffer.alloc(1024 * 1024, 2));
  await setRoute(a, 'relay');
  await setRoute(b, 'relay');
  await a.locator('input[type=file]').setInputFiles([big, small]);
  await b.getByText('small.bin').waitFor({ timeout: 15000 });
  check(await a.getByText(/"big.bin" .* not sent: through the TURN relay/).count() === 1, 'big file refused on TURN');
  check(await b.getByText('big.bin').count() === 0, 'small file still sent on TURN');
  await setRoute(a, 'direct');
  await setRoute(b, 'direct');
};

const echoState = page => app(page, async () => {
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { media } = await import('/web-rtc-chat/src/core/webrtc/state.ts');
  const { echoGuard, echoPrompt } = store.getState().call;

  return { echoGuard, echoPrompt, mic: media.localStream?.getAudioTracks()[0]?.enabled };
});

// B sends A's own voice back to A, 350 ms later: what a phone's loudspeaker does when its echo filter fails.
const makeEcho = b => app(b, async () => {
  const { sessions } = await import('/web-rtc-chat/src/core/webrtc/state.ts');
  const session = [...sessions.values()][0];

  while (!session.remoteStream?.getAudioTracks().length) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const context = new AudioContext();
  const delay = context.createDelay(2);
  const output = context.createMediaStreamDestination();

  delay.delayTime.value = 0.35;

  const voice = context.createMediaStreamSource(new MediaStream(session.remoteStream.getAudioTracks()));

  voice.connect(delay).connect(output);
  await session.peer.getSenders().find(sender => sender.track?.kind === 'audio')
    .replaceTrack(output.stream.getAudioTracks()[0]);
});

const call = async (a, b) => {
  await a.getByRole('button', { name: 'Audio call' }).click();
  await b.getByRole('button', { name: 'Accept' }).click();
  await a.getByRole('button', { name: 'Hang up' }).waitFor();
};

const waitForPrompt = async (page, seconds) => {
  for (let i = 0; i < seconds; i += 1) {
    if (await page.getByRole('alertdialog').count()) {
      return true;
    }

    await page.waitForTimeout(1000);
  }

  return false;
};

const testEcho = async (a, b) => {
  await call(a, b);
  check(!await waitForPrompt(b, 25), 'no echo prompt in a normal call (25 s)');
  await makeEcho(b);
  check(await waitForPrompt(b, 25), 'echo is noticed and B is asked');
  await b.mouse.click(5, 5);
  check(await b.getByRole('alertdialog').count() === 1, 'a tap beside the prompt does not close it');
  await b.getByRole('button', { name: 'Turn on', exact: true }).click();

  const samples = [];

  for (let i = 0; i < 30; i += 1) {
    await b.waitForTimeout(100);
    samples.push((await echoState(b)).mic ? 1 : 0);
  }

  check(samples.includes(0), `echo guard closes B's microphone while A talks (${samples.join('')})`);
  await b.getByRole('button', { name: 'Turn echo guard off' }).click();
  await b.waitForTimeout(300);
  check((await echoState(b)).mic === true, 'turning the guard off opens the microphone');
  await a.getByRole('button', { name: 'Hang up' }).click();
};

const A = await user('A', speechWav(1));
const B = await user('B', speechWav(2));

try {
  await connect(A.page, B.page);
  log('connected');
  await testMessages(A.page, B.page);
  await testRelayLimit(A.page, B.page);
  await testEcho(A.page, B.page);
} catch (err) {
  failures.push(String(err));
  log(`ERROR ${err}`);
} finally {
  await A.browser.close();
  await B.browser.close();
}

log(failures.length ? `${failures.length} FAILED` : 'ALL PASSED');
process.exit(failures.length ? 1 : 0);
