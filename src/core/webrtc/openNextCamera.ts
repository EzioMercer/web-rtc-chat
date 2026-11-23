import { getCamera } from './getCamera.ts';

// Stops camera `current` and opens the next one: on a phone the one facing the other way, elsewhere (or if there is
// none) the next one in the list. If that fails, `current`'s camera opens again. It is stopped first because phones
// (above all iPhones) can't run two cameras at once.
export const openNextCamera = async (current: MediaStreamTrack): Promise<MediaStreamTrack> => {
  const { facingMode, deviceId } = current.getSettings();
  const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
  const next = cameras[(cameras.findIndex(d => d.deviceId === deviceId) + 1) % cameras.length];

  const nextInList = () => getCamera(next ? { deviceId: { exact: next.deviceId } } : {});

  current.stop();

  const other = facingMode === 'user' || facingMode === 'environment'
    ? getCamera({ facingMode: { exact: facingMode === 'user' ? 'environment' : 'user' } }).catch(nextInList)
    : nextInList();

  return other.catch(() => getCamera(deviceId ? { deviceId: { exact: deviceId } } : {}));
};
