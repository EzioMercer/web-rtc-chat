import { LIVE_MAX_MS } from '../../../core/location/config.ts';
import { validPoint } from '../../../core/location/validPoint.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { ControlType, type LocationSignal } from '../../../core/webrtc/types.ts';
import { locationChanged, peerLocationReceived } from '../../chat/chatSlice.ts';
import { MessageAuthor, MessageKind } from '../../chat/types.ts';
import { peerMessageId } from '../../chat/peerMessageId.ts';
import type { AppThunk } from '../../store.ts';
import { countUnread } from '../chat/countUnread.ts';

// Longest wait we believe, as for texts (see receivePeerText).
const MAX_WAITED_MS = 7 * 24 * 3600 * 1000;

const time = (value: unknown, max: number) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.min(value, max) : 0
);

// Their location: a new one, or a newer state of a live one they already sent (it moved, or stopped).
export const receiveLocation = (key: string, signal: Partial<LocationSignal>): AppThunk => (dispatch, getState) => {
  const ours = peerMessageId(signal.id);
  const rev = typeof signal.rev === 'number' && Number.isSafeInteger(signal.rev) ? signal.rev : 0;

  if (!ours || typeof signal.id !== 'string' || !validPoint(signal)) {
    return;
  }

  // Confirm it arrived, even if it's a copy: the first confirmation may have been lost.
  sendControl(key, { t: ControlType.Ack, id: signal.id, rev });

  const now = Date.now();
  const point = { lat: signal.lat, lng: signal.lng, accuracy: signal.accuracy };
  const live = signal.live === undefined
    ? undefined
    : { liveUntil: now + time(signal.live, LIVE_MAX_MS), updatedAt: now };
  const known = getState().chat.conversations[key]?.find(message => message.id === ours);

  if (known) {
    if (known.kind === MessageKind.Location && known.liveUntil !== undefined && live && rev > (known.rev ?? 0)) {
      // A stop can't make it run longer, and a late copy can't restart it.
      dispatch(locationChanged({
        key,
        id: ours,
        change: { ...point, rev, updatedAt: now, liveUntil: Math.min(known.liveUntil, live.liveUntil) },
      }));
    }

    return;
  }

  const at = now - time(signal.waited, MAX_WAITED_MS);

  dispatch(peerLocationReceived({
    key,
    message: { kind: MessageKind.Location, id: ours, from: MessageAuthor.Peer, ...point, at, ...live, rev },
  }));
  dispatch(countUnread(key));
};
