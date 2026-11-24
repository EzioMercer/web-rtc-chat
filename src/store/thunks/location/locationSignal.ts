import { replyField } from '../../chat/replyField.ts';
import { type LocationMessage } from '../../chat/types.ts';
import { ControlType, type LocationSignal } from '../../../core/webrtc/types.ts';

// What we send of our location: its latest state, with how long a live one still runs.
export const locationSignal = (message: LocationMessage, waited?: number): LocationSignal => ({
  t: ControlType.Location,
  id: message.id,
  lat: message.lat,
  lng: message.lng,
  accuracy: message.accuracy,
  live: message.liveUntil === undefined ? undefined : Math.max(0, message.liveUntil - Date.now()),
  rev: message.rev ?? 0,
  waited,
  ...replyField(message),
});
