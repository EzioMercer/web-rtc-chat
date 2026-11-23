import type { GeoPoint } from '../../store/chat/types.ts';

// An Apple Maps link to the place: opens the Maps app on an iPhone, iPad or Mac.
export const appleMapsUrl = ({ lat, lng }: GeoPoint): string => (
  `https://maps.apple.com/?ll=${lat.toFixed(6)},${lng.toFixed(6)}&q=Shared%20location`
);
