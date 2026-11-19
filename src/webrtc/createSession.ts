import { remoteStreamChanged } from '../store/call/callSlice.ts';
import { sessionDetail, sessionLogged } from '../store/sessions/sessionsSlice.ts';
import type { AppDispatch } from '../store/store.ts';
import { manualPathFailed } from '../store/thunks/manual/manualPathFailed.ts';
import { sessionDropped } from '../store/thunks/session/sessionDropped.ts';
import { bindChannel } from './bindChannel.ts';
import { CONTROL_LABEL, FILE_LABEL, MANUAL_KEY, STUN_SERVERS } from './config.ts';
import { describeCandidates } from './describeCandidates.ts';
import { negotiate } from './negotiate.ts';
import { receiveFile } from './receiveFile.ts';
import { sendControl } from './sendControl.ts';
import { sessions } from './state.ts';
import { turnServers } from './turnServers.ts';
import type { Session } from './types.ts';

type Options = Pick<Session, 'key' | 'sid' | 'outgoing' | 'polite'>;

// A new peer connection for `key`, replacing none: close the old one first.
// Call ensureTurnServers() first, so the TURN relay is there for networks that need it.
export const createSession = (options: Options, dispatch: AppDispatch): Session => {
  const peer = new RTCPeerConnection({ iceServers: [...STUN_SERVERS, ...turnServers()] });
  const session: Session = {
    ...options,
    peer,
    channel: null,
    makingOffer: false,
    ignoreOffer: false,
    remoteStream: null,
    senders: [],
    closing: false,
    opened: false,
    sentOffer: null,
    attachOnOffer: false,
    log: text => dispatch(sessionLogged({ key: options.key, text })),
  };

  peer.ondatachannel = ({ channel }) => {
    if (channel.label === CONTROL_LABEL) {
      bindChannel(session, channel, dispatch);
    } else if (channel.label === FILE_LABEL) {
      receiveFile(session.key, channel, dispatch);
    }
  };

  peer.ontrack = ({ track, streams }) => {
    session.log(`Receiving their ${track.kind}`);

    session.remoteStream = streams[0] ?? session.remoteStream ?? new MediaStream();

    if (!session.remoteStream.getTracks().includes(track)) {
      session.remoteStream.addTrack(track);
    }

    dispatch(remoteStreamChanged());
  };

  peer.onnegotiationneeded = () => negotiate(session);

  // Candidates found during renegotiation go over the control channel (the first ones are inside the offer/answer).
  peer.onicecandidate = ({ candidate }) => {
    if (candidate) {
      sendControl(session.key, { t: 'ice', candidate: candidate.toJSON() });
    }
  };

  peer.oniceconnectionstatechange = () => {
    dispatch(sessionLogged({ key: session.key, text: `Network path: ${peer.iceConnectionState}` }));

    if (peer.iceConnectionState === 'checking' && !session.opened) {
      dispatch(sessionDetail({ key: session.key, detail: 'Trying network paths between your devices…' }));
    }
  };

  peer.onicegatheringstatechange = () => {
    if (peer.iceGatheringState === 'complete') {
      const text = `Our addresses: ${describeCandidates(peer.localDescription?.sdp)}`;

      dispatch(sessionLogged({ key: session.key, text }));
    }
  };

  peer.onconnectionstatechange = () => {
    dispatch(sessionLogged({ key: session.key, text: `Connection: ${peer.connectionState}` }));

    if (peer.connectionState !== 'failed') {
      return;
    }

    // An open connection that failed is gone.
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

  sessions.set(options.key, session);

  return session;
};
