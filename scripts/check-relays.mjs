// Checks that each public relay accepts and forwards the app's signaling events (ephemeral kind, `p` tag,
// throwaway key), for a small event and one as big as a real offer. Run: node scripts/check-relays.mjs
import { encrypt, getConversationKey } from 'nostr-tools/nip44';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { Relay } from 'nostr-tools/relay';

const RELAYS = (process.env.RELAYS ?? 'wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net,wss://nostr.mom')
  .split(',');
const KIND = 20784;
const WAIT_MS = 8000;

const makeEvent = (mailbox, size) => {
  const throwaway = generateSecretKey();
  const content = encrypt('x'.repeat(size), getConversationKey(throwaway, mailbox));

  const template = { kind: KIND, created_at: Math.floor(Date.now() / 1000), tags: [['p', mailbox]], content };

  return finalizeEvent(template, throwaway);
};

const check = async (url, size) => {
  const mailbox = getPublicKey(generateSecretKey());
  const result = { url, size, connected: false, accepted: null, delivered: false, ms: 0 };
  let relay;

  try {
    relay = await Relay.connect(url);
    result.connected = true;
  } catch (err) {
    result.accepted = `connect failed: ${err?.message ?? err}`;

    return result;
  }

  const start = Date.now();
  const delivered = new Promise((resolve) => {
    relay.subscribe([{ 'kinds': [KIND], '#p': [mailbox] }], { onevent: () => resolve(true) });
    setTimeout(() => resolve(false), WAIT_MS);
  });

  await new Promise(r => setTimeout(r, 500));

  const event = makeEvent(mailbox, size);

  try {
    result.accepted = await relay.publish(event) || 'ok';
  } catch (err) {
    result.accepted = `rejected: ${err?.message ?? err}`;
  }

  result.delivered = await delivered;
  result.ms = Date.now() - start;
  result.eventBytes = JSON.stringify(event).length;
  relay.close();

  return result;
};

for (const url of RELAYS) {
  for (const size of [200, 3000, 8000]) {
    console.log(JSON.stringify(await check(url, size)));
  }
}

process.exit(0);
