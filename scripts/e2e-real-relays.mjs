// A (Chromium) adds B (Firefox) and C (WebKit) with invites and connects, through the real public relays. Checks:
// both sides show the same safety code, A saves one key per contact, a text arrives, and after a reload A
// reconnects with its saved key. All run on the same machine, so the direct connection itself always works.
// Run after `npm run build && npx vite preview --port 4173`: node scripts/e2e-real-relays.mjs
// B=chromium C=chromium picks other browsers.
import { chromium, firefox, webkit } from 'playwright';

// Firefox's WebRTC fails on pages opened as localhost in the cloud container; 127.0.0.1 works.
const URL = 'http://127.0.0.1:4173/web-rtc-chat/';
const BROWSERS = { chromium, firefox, webkit };

const log = message => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const fail = (message) => {
  log(`FAILED: ${message}`);
  process.exit(1);
};

const user = async (type, name) => {
  // In the cloud container the internet is reached through a proxy whose certificate only Chromium trusts, and
  // .local addresses (which browsers use to hide local IPs) can't be looked up.
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } : undefined;
  const browser = await type.launch(type === chromium
    ? { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] }
    : { proxy, firefoxUserPrefs: { 'media.peerconnection.ice.obfuscate_host_addresses': false } });
  const page = await (await browser.newContext({ ignoreHTTPSErrors: type !== chromium })).newPage();

  page.on('pageerror', err => log(`[${name} error] ${err.message}`));
  await page.goto(URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Add contact' }).waitFor();

  return page;
};

const safetyCode = async page => (await page.getByRole('list', { name: 'Safety code' }).innerText()).replace(/\s+/g, ' ');

const showLogs = async (pages) => {
  for (const [page, name] of pages) {
    await page.getByRole('button', { name: 'Connection log' }).click();
    log(`${name} log:\n${await page.getByLabel('Connection log', { exact: true }).last().innerText()}`);
  }
};

// `a` invites `b`; both name each other and connect.
const add = async ([a, aName], [b, bName]) => {
  await a.getByRole('button', { name: 'Add contact' }).click();

  const link = await a.getByLabel('Invite link').inputValue({ timeout: 15000 });

  await a.getByRole('button', { name: 'Close' }).click();
  await b.getByRole('button', { name: 'Add contact' }).click();
  await b.getByRole('tab', { name: 'I have an invite' }).click();
  await b.getByLabel('Or paste their invite link').fill(link);
  await b.getByRole('button', { name: 'Open invite' }).click();
  await b.getByRole('textbox', { name: 'Name' }).fill(aName);
  await b.getByRole('button', { name: 'Add contact' }).last().click();
  await a.getByText('Someone used your invite').waitFor({ timeout: 30000 });
  await a.getByRole('textbox', { name: 'Name' }).fill(bName);
  await a.getByRole('button', { name: 'Accept' }).click();

  try {
    await a.getByText('Online · direct connection').waitFor({ timeout: 60000 });
    await b.getByText('Online · direct connection').waitFor({ timeout: 30000 });
  } catch {
    await showLogs([[a, aName], [b, bName]]);
    fail(`${aName} and ${bName} did not connect`);
  }

  const [codeA, codeB] = [await safetyCode(a), await safetyCode(b)];

  log(`${aName} and ${bName} connected through real relays. Safety code: ${codeA} | ${codeB}`);

  if (codeA !== codeB) {
    fail('the safety codes differ');
  }

  return codeA;
};

const savedKeys = page => page.evaluate(() => new Promise((resolve) => {
  const request = indexedDB.open('web-rtc-chat');

  request.onsuccess = () => {
    const get = request.result.transaction('kv').objectStore('kv').get('keys');

    get.onsuccess = () => resolve(Object.keys(get.result ?? {}).length);
  };
}));

const a = await user(chromium, 'Alice');
const b = await user(BROWSERS[process.env.B ?? 'firefox'], 'Bob');
const c = await user(BROWSERS[process.env.C ?? 'webkit'], 'Carol');

const codeB = await add([a, 'Alice'], [b, 'Bob']);
const codeC = await add([a, 'Alice'], [c, 'Carol']);

if (codeB === codeC) {
  fail('two contacts have the same safety code');
}

if (await savedKeys(a) !== 2) {
  fail('Alice should have saved one key per contact');
}

await a.getByRole('button', { name: /Bob/ }).first().click();
await a.getByPlaceholder('Type a message…').fill('hello Bob');
await a.keyboard.press('Enter');
await b.getByText('hello Bob').waitFor({ timeout: 15000 });
log('a text arrived');

await a.reload();
await a.getByRole('button', { name: /Carol/ }).first().click();
await a.getByText('Online · direct connection').waitFor({ timeout: 60000 });
await a.getByPlaceholder('Type a message…').fill('after reload');
await a.keyboard.press('Enter');
await c.getByText('after reload').waitFor({ timeout: 15000 });
log('after a reload, Alice reconnected with her saved key');
log('ALL PASSED');
process.exit(0);
