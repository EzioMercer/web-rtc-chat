import { senderKind } from '../../../core/webrtc/senderKind.ts';
import { sendMove } from '../../../core/webrtc/sendMove.ts';
import { media } from '../../../core/webrtc/state.ts';
import { type Move, type Session, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import { waitForIceGathering } from '../../../core/webrtc/waitForIceGathering.ts';
import type { AppThunk } from '../../store.ts';
import { endMove } from './endMove.ts';

// The leader's offer for the new connection: its first `count` slots carry the leader's tracks, the rest ours.
export const answerMove = (session: Session, move: Move, sdp: string, count: number): AppThunk<Promise<void>> => async (
  dispatch,
) => {
  const { peer } = move.other;

  if (move.phase !== MovePhase.Connecting || peer.remoteDescription) {
    return;
  }

  await peer.setRemoteDescription({ type: 'offer', sdp });

  const transceivers = peer.getTransceivers();
  const mine = transceivers.slice(count);
  const { senders } = session;

  if (mine.length !== senders.length
    || mine.some((t, i) => t.receiver.track.kind !== senderKind(session.peer, senders[i]))) {
    dispatch(endMove(session, move.id, 'Our call changed during the direct connection test', true));

    return;
  }

  const stream = media.localStream;

  move.theirs = transceivers.slice(0, count);
  move.pairs = senders.map((sender, i) => [sender, mine[i].sender]);
  mine.forEach((t) => {
    t.direction = 'sendonly';

    if (stream) {
      t.sender.setStreams?.(stream);
    }
  });

  await peer.setLocalDescription(await peer.createAnswer());
  await waitForIceGathering(peer);

  if (session.move === move && peer.localDescription) {
    sendMove(session.key, { step: MoveStep.Answer, id: move.id, sdp: peer.localDescription.sdp });
  }
};
