import type { GeoPoint } from '../../store/chat/types.ts';
import { FIX_TIMEOUT_MS } from './config.ts';
import { toGeoPoint } from './toGeoPoint.ts';

// Where this device is now. The browser asks the user the first time. Rejects with the browser's error.
export const findPosition = (maximumAge = 0): Promise<GeoPoint> => new Promise((resolve, reject) => {
  if (!('geolocation' in navigator)) {
    reject(new Error('No geolocation'));

    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => resolve(toGeoPoint(position)),
    reject,
    { enableHighAccuracy: true, timeout: FIX_TIMEOUT_MS, maximumAge },
  );
});
