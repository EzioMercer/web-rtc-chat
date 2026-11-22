import { CONTROL_LABEL } from '../../../core/webrtc/config.ts';
import { handleControlMessage } from '../../../core/webrtc/handleControlMessage.ts';
import { senderKind } from '../../../core/webrtc/senderKind.ts';
import { sendMove } from '../../../core/webrtc/sendMove.ts';
import { media } from '../../../core/webrtc/state.ts';
import { TrackKind } from '../../../core/webrtc/TrackKind.ts';
import { type Move, type Session, MovePhase, MoveStep } from '../../../core/webrtc/types.ts';
import { waitForIceGathering } from '../../../core/webrtc/waitForIceGathering.ts';
import type { AppThunk } from '../../store.ts';
import { testMove } from './testMove.ts';

// A call has a few tracks at most: anything more from their side is ignored.
const MAX_SLOTS = 4;

// They are ready (`kinds`: what their call sends): offer the new connection, with a slot for each of our call's
// tracks and each of theirs. Nothing goes out on them until the call moves.
export const offerMove = (session: Session, move: Move, kinds: unknown[]): AppThunk<Promise<void>> => async (
  dispatch,
) => {
  if (move.phase !== MovePhase.Asking) {
    return;
  }

  const { peer } = move.other;
  const stream = media.localStream;
  const ours = session.senders.map(sender => ({ sender, kind: senderKind(session.peer, sender) }));
  const theirs = kinds.filter(kind => kind === TrackKind.Audio || kind === TrackKind.Video).slice(0, MAX_SLOTS);

  move.phase = MovePhase.Connecting;
  move.pairs = ours.map(({ sender, kind }) => [
    sender,
    peer.addTransceiver(kind, { direction: 'sendonly', streams: stream ? [stream] : [] }).sender,
  ]);
  move.theirs = theirs.map(kind => peer.addTransceiver(kind, { direction: 'recvonly' }));

  const channel = peer.createDataChannel(CONTROL_LABEL);

  move.other.channel = channel;
  channel.onmessage = (e: MessageEvent) => handleControlMessage(session.key, e.data, dispatch);
  channel.onopen = () => dispatch(testMove(session, move.id));

  await peer.setLocalDescription(await peer.createOffer());
  // Every address in the offer: none are sent later.
  await waitForIceGathering(peer);

  if (session.move === move && peer.localDescription) {
    const { sdp } = peer.localDescription;

    sendMove(session.key, { step: MoveStep.Offer, id: move.id, sdp, kinds: ours.map(({ kind }) => kind) });
  }
};
