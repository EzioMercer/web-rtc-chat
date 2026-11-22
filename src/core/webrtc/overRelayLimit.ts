import { TURN_FILE_LIMIT } from './config.ts';
import type { Session } from './types.ts';

// "10 MB", for messages to the user.
export const RELAY_LIMIT_TEXT = `${TURN_FILE_LIMIT / 1024 / 1024} MB`;

// A file this big must not go through the TURN relay (we pay for its traffic); a direct connection takes any size.
export const overRelayLimit = (session: Session | undefined, size: number) => session?.route === 'relay'
  && size > TURN_FILE_LIMIT;
