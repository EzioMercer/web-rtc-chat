// Checks the TURN setup end to end: the Worker hands out credentials, and two browser connections that are only
// allowed to use the TURN relay (no direct path) can exchange a message through it.
import { chromium } from 'playwright';

const URL = process.env.TURN_URL ?? 'https://web-rtc-chat-turn.rovsanbadirxanov.workers.dev';

const response = await fetch(URL, { headers: { Origin: 'https://eziomercer.github.io' } });

if (!response.ok) {
  console.error(`Worker answered HTTP ${response.status}: ${await response.text()}`);
  process.exit(1);
}

const { iceServers, ttl } = await response.json();

console.log(`Worker OK, ttl ${ttl}s, urls:`, iceServers.flatMap(s => [s.urls].flat()));

const browser = await chromium.launch();
const page = await browser.newPage();

const result = await page.evaluate(async (servers) => {
  const config = { iceServers: servers, iceTransportPolicy: 'relay' };
  const a = new RTCPeerConnection(config);
  const b = new RTCPeerConnection(config);
  const types = [];

  a.onicecandidate = ({ candidate }) => candidate && (types.push(candidate.type), b.addIceCandidate(candidate));
  b.onicecandidate = ({ candidate }) => candidate && a.addIceCandidate(candidate);

  const received = new Promise((resolve) => {
    b.ondatachannel = ({ channel }) => (channel.onmessage = ({ data }) => resolve(data));
  });

  const channel = a.createDataChannel('test');

  channel.onopen = () => channel.send('hello through TURN');
  await a.setLocalDescription(await a.createOffer());
  await b.setRemoteDescription(a.localDescription);
  await b.setLocalDescription(await b.createAnswer());
  await a.setRemoteDescription(b.localDescription);

  const timeout = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 20000));

  return { message: await Promise.race([received, timeout]), types, state: a.connectionState };
}, iceServers);

await browser.close();
console.log(result);

if (result.message !== 'hello through TURN') {
  console.error('No message got through the TURN relay');
  process.exit(1);
}

console.log('TURN relay works');
