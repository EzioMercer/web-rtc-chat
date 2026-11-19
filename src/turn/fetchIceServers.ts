// The only network request the app makes itself: short-lived TURN credentials from our Cloudflare Worker.
// It carries nothing about the user, contacts or messages.
export const fetchIceServers = async (url: string, timeoutMs: number) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  });

  if (!response.ok) {
    throw new Error(`TURN credentials: HTTP ${response.status}`);
  }

  return await response.json() as { iceServers: RTCIceServer[]; ttl: number };
};
