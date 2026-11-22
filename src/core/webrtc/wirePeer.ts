import { remoteStreamChanged } from '../../store/call/callSlice.ts';
import { sessionDetail, sessionLogged } from '../../store/sessions/sessionsSlice.ts';
import type { AppDispatch } from '../../store/store.ts';
import { relayCandidate } from '../../store/thunks/contact/relayCandidate.ts';
import { manualPathFailed } from '../../store/thunks/manual/manualPathFailed.ts';
import { endMove } from '../../store/thunks/move/endMove.ts';
import { moveBack } from '../../store/thunks/move/moveBack.ts';
import { finishRescue, rescuePath } from '../../store/thunks/session/rescuePath.ts';
import { sessionDropped } from '../../store/thunks/session/sessionDropped.ts';
import { bindChannel } from './bindChannel.ts';
import { CONTROL_LABEL, FILE_LABEL, MANUAL_KEY } from './config.ts';
import { describeCandidates } from './describeCandidates.ts';
import { handleControlMessage } from './handleControlMessage.ts';
import { negotiate } from './negotiate.ts';
import { receiveFile } from './receiveFile.ts';
import { sendControl } from './sendControl.ts';
import { trackFileChannel } from './trackFileChannel.ts';
import { type Session, ControlType, MovePhase } from './types.ts';

// Handles `peer`'s events for `session`. A session can have two connections while its call moves to a new one
// (see store/thunks/move): only the one in use (session.peer) acts on the session; the other one still receives
// files, and the new one its test channel.
export const wirePeer = (session: Session, peer: RTCPeerConnection, dispatch: AppDispatch) => {
  const inUse = () => session.peer === peer;

  peer.ondatachannel = ({ channel }) => {
    if (channel.label === FILE_LABEL) {
      trackFileChannel(peer, channel);
      receiveFile(session.key, channel, dispatch);
    } else if (channel.label !== CONTROL_LABEL) {
      return;
    } else if (inUse()) {
      bindChannel(session, channel, dispatch);
    } else if (session.move?.other.peer === peer) {
      // The new connection's control channel: it carries the test, and becomes the control channel after the move.
      session.move.other.channel = channel;
      channel.onmessage = (e: MessageEvent) => handleControlMessage(session.key, e.data, dispatch);
    }
  };

  peer.ontrack = ({ track, streams }) => {
    // On the new connection, their tracks are collected when the call moves.
    if (!inUse()) {
      return;
    }

    session.log(`Receiving their ${track.kind}`);

    session.remoteStream = streams[0] ?? session.remoteStream ?? new MediaStream();

    if (!session.remoteStream.getTracks().includes(track)) {
      session.remoteStream.addTrack(track);
    }

    dispatch(remoteStreamChanged());
  };

  peer.onnegotiationneeded = () => {
    if (inUse()) {
      void negotiate(session);
    }
  };

  // The first addresses are inside the offer/answer. Later ones go over the control channel, or through relays
  // while it isn't open yet: otherwise the other side never learns them (a slow network can take half a minute).
  peer.onicecandidate = ({ candidate }) => {
    if (!candidate || !inUse() || sendControl(session.key, { t: ControlType.Ice, candidate: candidate.toJSON() })) {
      return;
    }

    if (session.signaled && !session.opened && session.key !== MANUAL_KEY) {
      dispatch(relayCandidate(session, candidate.toJSON()));
    }
  };

  peer.oniceconnectionstatechange = () => {
    if (!inUse()) {
      return;
    }

    dispatch(sessionLogged({ key: session.key, text: `Network path: ${peer.iceConnectionState}` }));

    if (peer.iceConnectionState === 'checking' && !session.opened) {
      dispatch(sessionDetail({ key: session.key, detail: 'Trying network paths between your devices…' }));
    }

    const lost = peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed';

    // Right after a move, go back to the old connection; otherwise look for a new path now, instead of waiting
    // for "failed".
    if (lost && session.move?.phase === MovePhase.Holding) {
      void dispatch(moveBack(session, true));
    } else if (lost && session.opened) {
      if (session.move) {
        dispatch(endMove(session, session.move.id, 'The connection lost its path', true));
      }

      void dispatch(rescuePath(session));
    }

    dispatch(finishRescue(session));
  };

  peer.onicegatheringstatechange = () => {
    if (inUse() && peer.iceGatheringState === 'complete') {
      const text = `Our addresses: ${describeCandidates(peer.localDescription?.sdp)}`;

      dispatch(sessionLogged({ key: session.key, text }));
    }
  };

  peer.onconnectionstatechange = () => {
    if (!inUse()) {
      return;
    }

    dispatch(sessionLogged({ key: session.key, text: `Connection: ${peer.connectionState}` }));

    // An open connection that failed is gone, unless a new path is being searched for (it has its own timeout),
    // or the call goes back to the old connection.
    if (peer.connectionState !== 'failed' || session.move?.phase === MovePhase.Holding
      || (session.opened && session.rescueSince !== null)) {
      return;
    }

    if (session.opened) {
      dispatch(sessionDropped(session));

      return;
    }

    // Before the first connection, "failed" isn't final: the browser still answers the other side's checks and
    // connects as soon as they arrive (e.g. once the other side applies our code). The attempt's own timeout,
    // or "Start over", ends it.
    dispatch(sessionLogged({ key: session.key, text: 'No path found yet; still waiting for their side…' }));

    if (session.key === MANUAL_KEY) {
      dispatch(manualPathFailed());
    }
  };
};
