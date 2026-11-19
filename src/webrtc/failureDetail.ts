import { describeCandidates } from './describeCandidates.ts';
import type { Session } from './types.ts';

// Why a connection attempt failed, in words.
export const failureDetail = (session: Session): string => {
  const { localDescription, remoteDescription } = session.peer;

  if (!remoteDescription) {
    return 'No answer. They may be offline, or the app is closed on their side.';
  }

  return 'Reached them through the relays, but no direct network path worked '
    + `(your addresses: ${describeCandidates(localDescription?.sdp)}; `
    + `theirs: ${describeCandidates(remoteDescription.sdp)}). `
    + 'These networks need a TURN relay to connect.';
};
