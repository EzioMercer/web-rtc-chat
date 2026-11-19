// idle: never tried. connecting: asking through relays / setting up. connected: direct link is open.
// offline: no answer, or the link closed.
export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'offline';

export type SessionRoute = 'direct' | 'relay';

export type SessionsState = {
  status: Record<string, SessionStatus>;
  // What is happening, or why the last attempt failed, in words for the user.
  detail: Record<string, string>;
  // Recent connection steps, with times, for troubleshooting. Memory only.
  log: Record<string, string[]>;
  // How the open connection travels: straight between the devices, or through the TURN relay.
  route: Record<string, SessionRoute>;
};
