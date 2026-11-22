import type { AppDispatch } from '../../store/store.ts';
import { sessionDropped } from '../../store/thunks/session/sessionDropped.ts';
import { sessionOpened } from '../../store/thunks/session/sessionOpened.ts';
import { handleControlMessage } from './handleControlMessage.ts';
import type { Session } from './types.ts';

// Makes `channel` the session's control channel and mirrors its events into the store.
export const bindChannel = (session: Session, channel: RTCDataChannel, dispatch: AppDispatch) => {
  session.channel = channel;
  channel.onopen = () => dispatch(sessionOpened(session));
  channel.onclose = () => dispatch(sessionDropped(session));
  channel.onmessage = (e: MessageEvent) => handleControlMessage(session.key, e.data, dispatch);
};
