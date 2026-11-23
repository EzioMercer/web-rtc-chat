import type { AppDispatch } from '../../store/store.ts';
import { STUN_SERVERS } from './config.ts';
import type { Link, Session } from './types.ts';
import { wirePeer } from './wirePeer.ts';

// A second connection for `session`'s call to move to. No TURN servers: if it opens, the path is direct.
export const createMoveLink = (session: Session, dispatch: AppDispatch): Link => {
  const peer = new RTCPeerConnection({ iceServers: STUN_SERVERS });

  wirePeer(session, peer, dispatch);

  return {
    peer,
    channel: null,
    senders: [],
    screenSender: null,
    remoteStream: null,
    iceServers: [],
    ourRelay: null,
    theirRelay: false,
  };
};
