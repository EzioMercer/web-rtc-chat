// Two browsers add each other with an invite and connect, through the real public relays.
// Both run on the same machine, so the direct connection itself always works: this tests the relays.
// Run after `npm run build && npx vite preview --port 4173`: node scripts/e2e-real-relays.mjs
import { chromium } from 'playwright';

const URL = 'http://localhost:4173/web-rtc-chat/';

const log = message => console.log(`${new Date().toISOString().slice(11, 19)} ${message}`);

const user = async (browser, name) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => log(`[${name} console.${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => log(`[${name} error] ${err.message}`));
  await page.goto(URL);
  await page.getByText('No protection', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my identity' }).click();
  await page.getByRole('button', { name: 'Add contact' }).waitFor();

  return page;
};

const browser = await chromium.launch();
const a = await user(browser, 'A');
const b = await user(browser, 'B');

await a.getByRole('button', { name: 'Add contact' }).click();

const link = await a.getByLabel('Invite link').inputValue({ timeout: 15000 });

await a.getByRole('button', { name: 'Close' }).click();
log('invite created');
await b.getByRole('button', { name: 'Add contact' }).click();
await b.getByRole('tab', { name: 'I have an invite' }).click();
await b.getByLabel('Or paste their invite link').fill(link);
await b.getByRole('button', { name: 'Open invite' }).click();
await b.getByRole('textbox', { name: 'Name' }).fill('Alice');
await b.getByRole('button', { name: 'Add contact' }).last().click();
await a.getByText('Someone used your invite').waitFor({ timeout: 30000 });
log('invite request arrived');
await a.getByRole('textbox', { name: 'Name' }).fill('Bob');
await a.getByRole('button', { name: 'Accept' }).click();

let ok = true;

try {
  await a.getByText('Online · direct connection').waitFor({ timeout: 60000 });
  await b.getByText('Online · direct connection').waitFor({ timeout: 60000 });
  log('CONNECTED through real relays');
} catch {
  ok = false;
  log('NOT CONNECTED within 60s');
}

await browser.close();
process.exit(ok ? 0 : 1);
