import { CAMERA_VIDEO } from './config.ts';

// Opens a camera for the call: the default one, or the one `choice` picks (facingMode or deviceId).
export const getCamera = async (choice: MediaTrackConstraints = {}): Promise<MediaStreamTrack> => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { ...CAMERA_VIDEO, ...choice } });
  const [track] = stream.getVideoTracks();

  if (!track) {
    throw new Error('No camera picture');
  }

  return track;
};
