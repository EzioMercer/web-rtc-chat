import { media } from './state.ts';
import type { Move, Session } from './types.ts';

// Makes the session use the move's other connection, and keeps the one it used as the other.
export const swapLink = (session: Session, move: Move) => {
  const { peer, channel, senders, screenSender, remoteStream, iceServers, ourRelay, theirRelay } = session;

  Object.assign(session, move.other);
  move.other = { peer, channel, senders, screenSender, remoteStream, iceServers, ourRelay, theirRelay };
  move.pairs = move.pairs.map(([was, now]) => [now, was]);

  // Our shared screen now goes out on the sender that took its place.
  const { screen } = media;
  const pair = screen ? move.pairs.find(([, was]) => was === screen.sender) : undefined;

  if (screen && pair) {
    screen.sender = pair[0];
  }
};
