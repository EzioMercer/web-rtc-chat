// Two browsers connect by hand-copied codes and test moving a call from the TURN relay to a direct connection
// (store/thunks/move): the call moves without a gap, chat goes on, the old connection closes after a while; a
// direct connection that breaks right after the move sends the call back; a test that fails leaves the call alone.
// On one machine every path is direct, so the "relay" is only pretended (the route is set by hand). It reaches into
// the app's modules, which only the dev server serves, so run it against that:
//   VITE_TURN_URL= npx vite --port 5173 --strictPort &   then   node scripts/e2e-move.mjs
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
      '--use-fake-device-for-media-stream',
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

// Runs `fn` in the page with the manual session, the store and the move code at hand.
const inApp = (page, fn, arg) => page.evaluate(async ([source, value]) => {
  const { sessions } = await import('/web-rtc-chat/src/core/webrtc/state.ts');
  const { store } = await import('/web-rtc-chat/src/store/store.ts');
  const { startMove } = await import('/web-rtc-chat/src/store/thunks/move/startMove.ts');
  const { SessionRoute } = await import('/web-rtc-chat/src/store/sessions/types.ts');
  const { MovePhase } = await import('/web-rtc-chat/src/core/webrtc/types.ts');
  const session = sessions.get('manual');

  return new Function('ctx', `return (${source})(ctx)`)({ session, store, startMove, SessionRoute, MovePhase, value });
}, [fn.toString(), arg]);

const pretendRelay = page => inApp(page, ({ session, SessionRoute }) => {
  session.route = SessionRoute.Relay;
  window.oldPeer = session.peer;
});

const phase = page => inApp(page, ({ session, MovePhase }) => (session.move ? MovePhase[session.move.phase] : null));

// Both sides' move phase is `name` (null: no move).
const bothIn = (a, b, name) => async () => (await phase(a)) === name && (await phase(b)) === name;

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

// Counts their audio packets as they arrive, every 100 ms, on whichever connection the call uses. Returns a stop
// function that gives the longest time (ms) without a new packet, and the remote video's size.
const watchAudio = page => inApp(page, ({ session }) => {
  const counts = new Map();
  let lastNew = performance.now();
  let longest = 0;

  const timer = setInterval(async () => {
    const { peer } = session;
    const report = await peer.getStats();
    let packets = 0;

    report.forEach((stat) => {
      if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
        packets += stat.packetsReceived ?? 0;
      }
    });

    const now = performance.now();

    if (packets > (counts.get(peer) ?? 0)) {
      counts.set(peer, packets);
      lastNew = now;
    }

    longest = Math.max(longest, now - lastNew);
  }, 100);

  window.stopAudioWatch = () => {
    clearInterval(timer);

    return Math.round(longest);
  };
});

const stopAudio = page => page.evaluate(() => window.stopAudioWatch());

const videoPlays = page => page.evaluate(async () => {
  const video = [...document.querySelectorAll('video')].find(v => !v.muted);
  const before = video?.currentTime ?? 0;

  await new Promise(resolve => setTimeout(resolve, 600));

  return Boolean(video && video.videoWidth > 0 && video.currentTime > before);
});

const testMove = async (a, b) => {
  await pretendRelay(a);
  await pretendRelay(b);
  await watchAudio(a);
  await watchAudio(b);
  await inApp(a, ({ session, store, startMove }) => store.dispatch(startMove(session)));

  check(await waitFor('both moved', 40, bothIn(a, b, 'Holding')), 'the call moves to the new connection on both sides');

  const moved = page => inApp(page, ({ session, SessionRoute }) => (
    session.peer !== window.oldPeer && session.route === SessionRoute.Direct
  ));

  check(await moved(a) && await moved(b), 'both sides use the new connection and show a direct path');
  await a.waitForTimeout(2000);
  log(`longest gap in audio: A ${await stopAudio(a)} ms, B ${await stopAudio(b)} ms`);
  check(await videoPlays(a) && await videoPlays(b), 'both see the other\'s video after the move');

  await b.getByPlaceholder('Type a message…').fill('after the move');
  await b.keyboard.press('Enter');
  check(await waitFor('chat', 10, () => a.getByText('after the move').count()), 'chat goes on after the move');

  check(await waitFor('old closed', 45, bothIn(a, b, null)), 'the move ends after the hold time');
  check(await inApp(a, () => window.oldPeer.connectionState === 'closed'), 'the old connection is closed');
  check(await a.getByRole('button', { name: 'Hang up' }).count() === 1, 'the call is still on');
};

const testBack = async (a, b) => {
  await pretendRelay(a);
  await pretendRelay(b);
  await inApp(a, ({ session, store, startMove }) => store.dispatch(startMove(session)));
  await waitFor('both moved', 40, bothIn(a, b, 'Holding'));
  await watchAudio(a);

  // The new connection dies on B's side.
  await inApp(b, ({ session }) => session.peer.close());

  check(await waitFor('back', 20, bothIn(a, b, null)), 'a broken new connection ends the move on both sides');

  const back = page => inApp(page, ({ session }) => session.peer === window.oldPeer);

  check(await back(a) && await back(b), 'both sides are back on the old connection');
  await a.waitForTimeout(3000);
  log(`longest gap in audio at A: ${await stopAudio(a)} ms`);
  check(await videoPlays(a) && await videoPlays(b), 'both see the other\'s video again');
};

const testFailed = async (a, b) => {
  await pretendRelay(a);
  await pretendRelay(b);
  await inApp(a, ({ session }) => {
    session.restartedAt = 0;
  });
  await inApp(a, ({ session, store, startMove }) => store.dispatch(startMove(session)));
  await waitFor('testing', 40, async () => (await phase(a)) === 'Testing');

  // The test path dies on B's side.
  await inApp(b, ({ session }) => session.move?.other.peer.close());

  check(await waitFor('given up', 20, bothIn(a, b, null)), 'a failed test is given up on both sides');
  check(await inApp(a, ({ session }) => session.peer === window.oldPeer)
    && await inApp(b, ({ session }) => session.peer === window.oldPeer), 'the call stays on the old connection');
  check(await videoPlays(a) && await videoPlays(b), 'the call goes on');
};

const A = await user('A');
const B = await user('B');

try {
  await connect(A.page, B.page);
  log('connected');
  await A.page.getByRole('button', { name: 'Video call' }).click();
  await B.page.getByRole('button', { name: 'Accept', exact: true }).click();
  await A.page.getByRole('button', { name: 'Hang up' }).waitFor();
  await A.page.waitForTimeout(3000);
  check(await videoPlays(A.page) && await videoPlays(B.page), 'the call runs');
  await testMove(A.page, B.page);
  await testBack(A.page, B.page);
  await testFailed(A.page, B.page);
} catch (err) {
  failures.push(String(err));
  log(`ERROR ${err}`);
} finally {
  for (const page of [A.page, B.page]) {
    const lines = await page.evaluate(async () => {
      const { store } = await import('/web-rtc-chat/src/store/store.ts');

      return store.getState().sessions.log.manual?.map(line => line.text ?? line) ?? [];
    }).catch(() => []);

    console.log(lines.slice(-40).join('\n'));
  }

  await A.browser.close();
  await B.browser.close();
}

log(failures.length ? `${failures.length} FAILED` : 'ALL PASSED');
process.exit(failures.length ? 1 : 0);
