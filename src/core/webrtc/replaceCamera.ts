import { media } from './state.ts';
import type { Session } from './types.ts';

// Puts camera track `now` everywhere `was` went: our stream (the preview), the senders on both connections while
// the call moves (see store/thunks/move), and the shared screen's "back to" track. No new offer needed.
export const replaceCamera = async (session: Session, was: MediaStreamTrack, now: MediaStreamTrack) => {
  const stream = media.localStream;

  stream?.removeTrack(was);
  stream?.addTrack(now);

  if (media.screen?.before === was) {
    media.screen.before = now;
  }

  const senders = [...session.senders, ...(session.move?.pairs.map(([, other]) => other) ?? [])];

  await Promise.all(senders.filter(s => s.track === was).map(s => s.replaceTrack(now)));
};
