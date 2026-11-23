import type { GeoPoint } from '../../store/chat/types.ts';

// A geo: link: Android shows its own list of every installed app that opens places (maps, taxis, …), or opens the
// one the user made the default.
export const geoUrl = ({ lat, lng }: GeoPoint): string => {
  const at = `${lat.toFixed(6)},${lng.toFixed(6)}`;

  return `geo:${at}?q=${at}`;
};
