import type { Move, Session } from './types.ts';

// Our call still sends on the same senders as when the move started (e.g. no screen was added meanwhile).
export const sameSenders = (session: Session, move: Move) => session.senders.length === move.pairs.length
  && move.pairs.every(([current], i) => session.senders[i] === current);
