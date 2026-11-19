// Cloudflare Worker that hands out short-lived TURN credentials.
// The TURN key's API token must stay secret, so it lives here (as a Worker secret), never in the website's code.
// Secrets: TURN_KEY_ID, TURN_KEY_API_TOKEN, ANALYTICS_API_TOKEN (Account Analytics: Read).
// Variables: ALLOWED_ORIGINS (comma-separated), ACCOUNT_ID.

// Credentials stay valid this long (seconds). Short, so a leaked one is useless soon.
const TTL = 3600;

// Stop handing out credentials once the TURN traffic of the last 30 days reaches this, so the free 1,000 GB a
// month is never exceeded: credentials already out (up to TTL) and running calls still add some after the stop.
const LIMIT_BYTES = 800e9;

// Ask Cloudflare for the usage at most this often.
const USAGE_CACHE_MS = 5 * 60_000;

// Browsers refuse port 53, so those URLs would only slow down gathering.
const usable = url => !/:53(\?|$)/.test(url);

let usage = { bytes: 0, at: 0 };

// TURN traffic sent out by Cloudflare (what's billed) over the last 30 days.
const turnUsageBytes = async (env) => {
  if (Date.now() - usage.at < USAGE_CACHE_MS) {
    return usage.bytes;
  }

  if (!/^[0-9a-f]{32}$/.test(env.ACCOUNT_ID ?? '')) {
    throw new Error('ACCOUNT_ID is missing or wrong');
  }

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 19) + 'Z';
  const until = new Date(Date.now() + 60_000).toISOString().slice(0, 19) + 'Z';
  const query = `{ viewer { accounts(filter: { accountTag: "${env.ACCOUNT_ID}" }) {
    callsTurnUsageAdaptiveGroups(
      limit: 1000,
      filter: { datetimeMinute_gt: "${since}", datetimeMinute_lt: "${until}" }
    ) {
      sum { egressBytes }
    }
  } } }`;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.ANALYTICS_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const { data, errors } = await response.json();

  if (!response.ok || errors?.length) {
    throw new Error(errors?.[0]?.message ?? `HTTP ${response.status}`);
  }

  const groups = data?.viewer?.accounts?.[0]?.callsTurnUsageAdaptiveGroups ?? [];
  const bytes = groups.reduce((total, group) => total + (group.sum?.egressBytes ?? 0), 0);

  usage = { bytes, at: Date.now() };

  return bytes;
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim()).includes(origin);
    const cors = allowed ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};

    if (!allowed || !['GET', 'OPTIONS'].includes(request.method)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    }

    // If the usage can't be checked, hand out nothing: never risk a bill. Direct connections still work.
    try {
      if (await turnUsageBytes(env) >= LIMIT_BYTES) {
        return new Response('TURN paused: the monthly limit is reached', { status: 503, headers: cors });
      }
    } catch (err) {
      return new Response(`TURN paused: usage check failed: ${err.message}`, { status: 503, headers: cors });
    }

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TTL }),
      },
    );

    if (!response.ok) {
      // The status says what's wrong (401: wrong token, 404: wrong key ID); it reveals nothing secret.
      return new Response(`TURN unavailable: Cloudflare answered ${response.status}`, { status: 502, headers: cors });
    }

    const { iceServers } = await response.json();
    const servers = [iceServers].flat().map(server => ({ ...server, urls: [server.urls].flat().filter(usable) }));

    return Response.json({ iceServers: servers, ttl: TTL }, { headers: { ...cors, 'Cache-Control': 'no-store' } });
  },
};
