import { media } from './state.ts';
import type { Session } from './types.ts';

// After applying the caller's offer: send our camera/microphone on the audio/video slots that offer just created,
// so the answer carries them. Falls back to adding tracks normally (one more offer) if there is no such slot.
export const attachToOffer = async (session: Session) => {
  const stream = media.localStream;

  if (!stream) {
    return;
  }

  const fresh = session.peer.getTransceivers()
    .filter(t => t.currentDirection === null && t.direction === 'recvonly' && t.mid !== null);

  for (const track of stream.getTracks()) {
    const index = fresh.findIndex(t => t.receiver.track.kind === track.kind);

    if (index < 0) {
      session.senders.push(session.peer.addTrack(track, stream));

      continue;
    }

    const [transceiver] = fresh.splice(index, 1);

    transceiver.direction = 'sendrecv';
    await transceiver.sender.replaceTrack(track);
    transceiver.sender.setStreams?.(stream);
    session.senders.push(transceiver.sender);
  }

  session.log(`Sending our ${stream.getTracks().map(track => track.kind).join(' and ')}`);
};
