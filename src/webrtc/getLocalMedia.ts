// Microphone, plus camera for video calls.
export const getLocalMedia = (video: boolean): Promise<MediaStream> => navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: true, noiseSuppression: true },
  video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
});
