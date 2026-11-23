import type { GeoPoint } from '../../store/chat/types.ts';

// The part of a browser position we share: the place and how accurate it is (rounded to whole metres).
export const toGeoPoint = ({ coords }: GeolocationPosition): GeoPoint => ({
  lat: coords.latitude,
  lng: coords.longitude,
  accuracy: Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : undefined,
});
