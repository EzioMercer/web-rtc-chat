import { errorText } from './errorText.ts';
import type { Session } from './types.ts';

// Changes some of the connection's network settings and keeps the rest: a setting left out of setConfiguration
// would go back to its default. Returns whether it worked.
export const configureIce = (session: Session, changes: RTCConfiguration): boolean => {
  try {
    session.peer.setConfiguration({ ...session.peer.getConfiguration(), ...changes });

    return true;
  } catch (err) {
    session.log(`Could not change the network settings: ${errorText(err)}`);

    return false;
  }
};
