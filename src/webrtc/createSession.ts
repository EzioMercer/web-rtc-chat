import { remoteStreamChanged } from '../store/call/callSlice.ts';
import type { AppDispatch } from '../store/store.ts';
import { sessionDropped } from '../store/thunks/session/sessionDropped.ts';
import { bindChannel } from './bindChannel.ts';
import { CONTROL_LABEL, FILE_LABEL, RTC_CONFIG } from './config.ts';
import { negotiate } from './negotiate.ts';
import { receiveFile } from './receiveFile.ts';
import { sendControl } from './sendControl.ts';
import { sessions } from './state.ts';
import type { Session } from './types.ts';

type Options = Pick<Session, 'key' | 'sid' | 'outgoing' | 'polite'>;

// A new peer connection for `key`, replacing none: close the old one first.
export const createSession = (options: Options, dispatch: AppDispatch): Session => {
  const peer = new RTCPeerConnection(RTC_CONFIG);
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
  };

  peer.ondatachannel = ({ channel }) => {
    if (channel.label === CONTROL_LABEL) {
      bindChannel(session, channel, dispatch);
    } else if (channel.label === FILE_LABEL) {
      receiveFile(session.key, channel, dispatch);
    }
  };

  peer.ontrack = ({ track, streams }) => {
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

  peer.onconnectionstatechange = () => {
    if (peer.connectionState === 'failed') {
      dispatch(sessionDropped(session));
    }
  };

  sessions.set(options.key, session);

  return session;
};
