import { useEffect, useState } from 'react';

// How many cameras the device has (it changes when one is plugged in or out), while `enabled`. Read once our
// camera is on: before the camera is allowed, browsers may list fewer.
export const useCameraCount = (enabled: boolean): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const devices = navigator.mediaDevices;

    if (!enabled || !devices?.enumerateDevices) {
      return;
    }

    let live = true;

    const read = () => void devices.enumerateDevices()
      .then((list) => {
        if (live) {
          setCount(list.filter(d => d.kind === 'videoinput').length);
        }
      })
      .catch(() => undefined);

    read();
    devices.addEventListener('devicechange', read);

    return () => {
      live = false;
      devices.removeEventListener('devicechange', read);
    };
  }, [enabled]);

  return count;
};
