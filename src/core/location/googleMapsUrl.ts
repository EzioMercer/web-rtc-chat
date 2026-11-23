import type { GeoPoint } from '../../store/chat/types.ts';

// A Google Maps link to the place: the app on a phone that has it, the website anywhere else. It is the link a long
// tap or right click copies, and the one Share sends, because it works for anyone on any device.
export const googleMapsUrl = ({ lat, lng }: GeoPoint): string => (
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`
);
