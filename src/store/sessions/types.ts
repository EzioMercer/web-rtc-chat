// idle: never tried. connecting: asking through relays / setting up. connected: direct link is open.
// offline: no answer, or the link closed.
export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'offline';

export type SessionsState = {
  status: Record<string, SessionStatus>;
  // What is happening, or why the last attempt failed, in words for the user.
  detail: Record<string, string>;
};
