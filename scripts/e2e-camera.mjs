// Two browsers connect by hand-copied codes and test the camera in calls: a video call answered with audio only,
// where the camera is turned on later; switching between two cameras; and that each side's word about its end of
// the path (the TURN relay or not) decides the route shown on the other side. It reaches into the app's modules,
// which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-camera.mjs
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/web-rtc-chat/';
const failures = [];

const log = message => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const check = (ok, what) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${what}`);

  if (!ok) {
    failures.push(what);
  }
};

const user = async (name) => {
  const browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      // Two fake cameras, so there is one to switch to.
      '--use-fake-device-for-media-stream=device-count=2',
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

// Runs `fn` in the page with the manual session and the app's modules at hand.
const inApp = (page, fn, arg) => page.evaluate(async ([source, value]) => {
  const { sessions, media } = await import('/web-rtc-chat/src/core/webrtc/state.ts');
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { sendControl } = await import('/web-rtc-chat/src/core/webrtc/sendControl.ts');
  const { SessionRoute } = await import('/web-rtc-chat/src/store/sessions/types.ts');
  const { ControlType } = await import('/web-rtc-chat/src/core/webrtc/types.ts');
  const session = sessions.get('manual');
  const ctx = { session, media, store, sendControl, SessionRoute, ControlType, value };

  return new Function('ctx', `return (${source})(ctx)`)(ctx);
}, [fn.toString(), arg]);

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

// Whether the page's video (`muted`: our own preview, otherwise theirs) is shown and its picture moves on.
const videoPlays = (page, muted) => page.evaluate(async (own) => {
  const video = [...document.querySelectorAll('video')].find(v => v.muted === own && v.offsetWidth > 0);
  const before = video?.currentTime ?? 0;

  await new Promise(resolve => setTimeout(resolve, 600));

  return Boolean(video && video.videoWidth > 0 && video.currentTime > before);
}, muted);

const cameraId = page => inApp(page, ({ media }) => media.localStream?.getVideoTracks()[0]?.getSettings().deviceId);

// The camera device that their side receives frames of: its picture changes when the camera does, so compare a
// tiny copy of a frame before and after.
const theirFrame = page => page.evaluate(() => {
  const video = [...document.querySelectorAll('video')].find(v => !v.muted);
  const canvas = document.createElement('canvas');

  canvas.width = 8;
  canvas.height = 8;
  canvas.getContext('2d').drawImage(video, 0, 0, 8, 8);

  return canvas.toDataURL();
});

const testAudioAnswer = async (a, b) => {
  await a.getByRole('button', { name: 'Video call' }).click();
  await b.getByRole('button', { name: 'Accept with audio only' }).click();
  await a.getByRole('button', { name: 'Hang up' }).waitFor();
  await a.waitForTimeout(2000);

  check(!(await videoPlays(a, false)), 'answered with audio only: the caller sees no video from them');
  check(await b.getByRole('button', { name: 'Turn camera on' }).count() === 1, 'the answerer can turn the camera on');

  await b.getByRole('button', { name: 'Turn camera on' }).click();

  check(await waitFor('their video', 15, () => videoPlays(a, false)), 'the caller now sees the answerer\'s camera');
  check(await videoPlays(b, true), 'the answerer sees their own preview');
  check(await videoPlays(b, false), 'the answerer still sees the caller');
  check(await b.getByRole('button', { name: 'Turn camera off' }).count() === 1, 'the button now turns it off');
};

const testSwitch = async (a, b) => {
  const button = a.getByRole('button', { name: 'Switch camera' });

  check(await waitFor('switch button', 5, async () => await button.count() === 1), 'two cameras: switching is offered');

  const before = await cameraId(a);
  const frame = await theirFrame(b);

  await button.click();

  check(await waitFor('other camera', 10, async () => (await cameraId(a)) !== before), 'the other camera is used');
  check(await waitFor('their picture', 10, async () => (await theirFrame(b)) !== frame), 'their side gets its picture');
  check(await videoPlays(a, true), 'our preview shows it');
  check(await videoPlays(b, false), 'their video goes on');
  check(await inApp(a, ({ session, media }) => {
    const track = media.localStream.getVideoTracks()[0];

    return media.localStream.getVideoTracks().length === 1 && session.senders.some(s => s.track === track);
  }), 'one camera in our stream, and it is the one sent');

  await button.click();
  check(await waitFor('first camera', 10, async () => (await cameraId(a)) === before), 'switching again goes back');

  // Turned off, it can't be switched; turned on, it is the same camera.
  await a.getByRole('button', { name: 'Turn camera off' }).click();
  check(await button.count() === 0, 'no switching while the camera is off');
  await a.getByRole('button', { name: 'Turn camera on' }).click();
  check(await waitFor('their video', 10, () => videoPlays(b, false)), 'camera back on');
};

const testRoute = async (a, b) => {
  const route = page => inApp(page, ({ session, SessionRoute }) => SessionRoute[session.route]);

  check(await route(a) === 'Direct' && await route(b) === 'Direct', 'on one machine both sides show a direct path');

  const told = await inApp(a, ({ session }) => session.ourRelay === false && session.theirRelay === false);

  check(told, 'each side told the other its end is not the relay');

  // B pretends its end is the TURN relay (as if A saw B's relay address as an ordinary one).
  await inApp(b, ({ sendControl, ControlType }) => sendControl('manual', { t: ControlType.Route, relay: true }));
  check(await waitFor('relay', 5, async () => (await route(a)) === 'Relay'), 'their word makes us show the relay');
  await inApp(b, ({ sendControl, ControlType }) => sendControl('manual', { t: ControlType.Route, relay: false }));
  check(await waitFor('direct', 5, async () => (await route(a)) === 'Direct'), 'and direct again when it is not');
};

const A = await user('A');
const B = await user('B');

try {
  await connect(A.page, B.page);
  log('connected');
  await testRoute(A.page, B.page);
  await testAudioAnswer(A.page, B.page);
  await testSwitch(A.page, B.page);
  await testSwitch(B.page, A.page);
} catch (err) {
  failures.push(String(err));
  log(`ERROR ${err}`);
} finally {
  for (const page of [A.page, B.page]) {
    const lines = await page.evaluate(async () => {
      const { store } = await import('/web-rtc-chat/src/store/store.ts');

      return store.getState().sessions.log.manual?.map(line => line.text ?? line) ?? [];
    }).catch(() => []);

    console.log(lines.slice(-25).join('\n'));
  }

  await A.browser.close();
  await B.browser.close();
}

log(failures.length ? `${failures.length} FAILED` : 'ALL PASSED');
process.exit(failures.length ? 1 : 0);
