import { configureIce } from './configureIce.ts';
import type { Session } from './types.ts';

// Searches for a new path on the open connection (the other side answers). 'all': a direct one too, if it works
// now. 'relay': only our relay addresses are offered, so the connection stays on the TURN relay and just gets a
// new relay path with fresh credentials, which keeps a long call from dropping when the old ones expire.
export const restartPaths = (session: Session, policy: RTCIceTransportPolicy) => {
  const set = session.peer.getConfiguration().iceTransportPolicy === policy
    || configureIce(session, { iceTransportPolicy: policy });

  // Without relay-only addresses, the search could move the call to an untested direct path: better skip it.
  if (!set && policy === 'relay') {
    return;
  }

  session.log(policy === 'relay' ? 'Renewing the TURN relay path…' : 'Looking for a direct path again…');
  session.peer.restartIce();
};
