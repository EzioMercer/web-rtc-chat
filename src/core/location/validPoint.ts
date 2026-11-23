import type { GeoPoint } from '../../store/chat/types.ts';

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

// Whether something from the other side (or a backup) is a real place.
export const validPoint = <T extends Partial<GeoPoint>>(point: T | null | undefined): point is T & GeoPoint => (
  Boolean(point)
  && finite(point?.lat) && Math.abs(point.lat) <= 90
  && finite(point.lng) && Math.abs(point.lng) <= 180
  && (point.accuracy === undefined || (finite(point.accuracy) && point.accuracy >= 0 && point.accuracy < 1e7))
);
