import { CAMERA_VIDEO } from './config.ts';

// Microphone, plus camera for video calls.
export const getLocalMedia = (video: boolean): Promise<MediaStream> => navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: video ? CAMERA_VIDEO : false,
});
