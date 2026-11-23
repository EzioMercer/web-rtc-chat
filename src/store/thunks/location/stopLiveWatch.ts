import { liveWatches } from '../../../core/location/liveWatches.ts';

// Stops following our position for live location `id` (it ended, was stopped, or its chat is gone).
export const stopLiveWatch = (id: string) => {
  const live = liveWatches.get(id);

  if (live) {
    navigator.geolocation.clearWatch(live.watch);
    window.clearInterval(live.timer);
    liveWatches.delete(id);
  }
};
