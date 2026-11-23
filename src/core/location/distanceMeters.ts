import type { GeoPoint } from '../../store/chat/types.ts';

const EARTH_RADIUS_M = 6_371_000;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Distance between two places along the Earth's surface (haversine), in metres.
export const distanceMeters = (a: GeoPoint, b: GeoPoint): number => {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};
