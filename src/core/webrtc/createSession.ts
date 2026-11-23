import { sessionLogged } from '../../store/sessions/sessionsSlice.ts';
import type { AppDispatch } from '../../store/store.ts';
import { STUN_SERVERS } from './config.ts';
import { sessions } from './state.ts';
import { turnServers } from './turnServers.ts';
import type { Session } from './types.ts';
import { wirePeer } from './wirePeer.ts';

type Options = Pick<Session, 'key' | 'sid' | 'outgoing' | 'polite'>;

// A new peer connection for `key`, replacing none: close the old one first.
// Call ensureTurnServers() first, so the TURN relay is there for networks that need it.
export const createSession = (options: Options, dispatch: AppDispatch): Session => {
  const iceServers = turnServers();
  const peer = new RTCPeerConnection({ iceServers: [...STUN_SERVERS, ...iceServers] });
  const session: Session = {
    ...options,
    peer,
    channel: null,
    makingOffer: false,
    ignoreOffer: false,
    remoteStream: null,
    senders: [],
    screenSender: null,
    closing: false,
    opened: false,
    sentOffer: null,
    signaled: false,
    lateCandidates: [],
    lateTimer: null,
    iceServers,
    route: null,
    ourRelay: null,
    theirRelay: false,
    restartedAt: Date.now(),
    attachOnOffer: false,
    rescueSince: null,
    move: null,
    log: text => dispatch(sessionLogged({ key: options.key, text })),
  };

  wirePeer(session, peer, dispatch);

  sessions.set(options.key, session);

  return session;
};
