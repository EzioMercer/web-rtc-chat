// Cloudflare Worker that hands out short-lived TURN credentials.
// The TURN key's API token must stay secret, so it lives here (as a Worker secret), never in the website's code.
// Secrets: TURN_KEY_ID, TURN_KEY_API_TOKEN. Variable: ALLOWED_ORIGINS (comma-separated).

// Credentials stay valid this long (seconds). Short, so a leaked one is useless soon.
const TTL = 3600;

// Browsers refuse port 53, so those URLs would only slow down gathering.
const usable = url => !/:53(\?|$)/.test(url);

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

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TTL }),
      },
    );

    if (!response.ok) {
      return new Response('TURN unavailable', { status: 502, headers: cors });
    }

    const { iceServers } = await response.json();
    const servers = [iceServers].flat().map(server => ({ ...server, urls: [server.urls].flat().filter(usable) }));

    return Response.json({ iceServers: servers, ttl: TTL }, { headers: { ...cors, 'Cache-Control': 'no-store' } });
  },
};
