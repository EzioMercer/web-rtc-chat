import { LIVE_HEARTBEAT_MS, LIVE_MIN_GAP_MS, LIVE_MOVE_M } from '../../../core/location/config.ts';
import { distanceMeters } from '../../../core/location/distanceMeters.ts';
import { liveWatches } from '../../../core/location/liveWatches.ts';
import { toGeoPoint } from '../../../core/location/toGeoPoint.ts';
import { type GeoPoint, MessageKind, MessageAuthor } from '../../chat/types.ts';
import type { AppThunk } from '../../store.ts';
import { changeOurLocation } from './changeOurLocation.ts';
import { findOurLocation } from './findOurLocation.ts';
import { sendLocation } from './sendLocation.ts';
import { stopLiveLocation } from './stopLiveLocation.ts';
import { stopLiveWatch } from './stopLiveWatch.ts';

// Shares our location live in conversation `key` for `duration` ms, starting at `point`. It follows the device's
// position while the app is open: sent again once it moved LIVE_MOVE_M, and every LIVE_HEARTBEAT_MS while it stays
// put. One live location per chat: an earlier one stops.
export const startLiveLocation = (key: string, point: GeoPoint, duration: number): AppThunk<boolean> => (
  dispatch,
  getState,
) => {
  getState().chat.conversations[key]?.forEach((message) => {
    if (message.kind === MessageKind.Location && message.from === MessageAuthor.Me && message.liveUntil !== undefined) {
      dispatch(stopLiveLocation(key, message.id));
    }
  });

  const id = dispatch(sendLocation(key, point, duration));

  if (!id) {
    return false;
  }

  let sent = point;
  let sentAt = Date.now();
  let latest = point;
  // A move that came too soon after the last send goes out once LIVE_MIN_GAP_MS has passed.
  let held: number | null = null;

  // Still ours, still running? Otherwise the watch ends (the chat may have been cleared meanwhile).
  const running = () => {
    const message = dispatch(findOurLocation(key, id));

    if (!message?.liveUntil || message.liveUntil <= Date.now()) {
      stopLiveWatch(id);

      return false;
    }

    return true;
  };

  const send = () => {
    if (held !== null) {
      window.clearTimeout(held);
      held = null;
    }

    sent = latest;
    sentAt = Date.now();
    dispatch(changeOurLocation(key, id, latest));
  };

  const moved = (position: GeolocationPosition) => {
    latest = toGeoPoint(position);

    if (!running() || distanceMeters(sent, latest) < LIVE_MOVE_M) {
      return;
    }

    const wait = LIVE_MIN_GAP_MS - (Date.now() - sentAt);

    if (wait <= 0) {
      send();
    } else {
      held ??= window.setTimeout(() => running() && send(), wait);
    }
  };

  const failed = (err: GeolocationPositionError) => {
    // Access taken away: it can't go on. (Timeouts and lost signal just wait for the next position.)
    if (err.code === err.PERMISSION_DENIED) {
      dispatch(stopLiveLocation(key, id));
    }
  };

  const watch = navigator.geolocation.watchPosition(moved, failed, { enableHighAccuracy: true, maximumAge: 5_000 });

  const timer = window.setInterval(() => {
    if (running() && Date.now() - sentAt >= LIVE_HEARTBEAT_MS - 1_000) {
      send();
    }
  }, LIVE_HEARTBEAT_MS);

  liveWatches.set(id, { key, watch, timer });

  return true;
};
