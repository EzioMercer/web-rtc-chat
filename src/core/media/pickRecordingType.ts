// What the receiver can play matters more than what is smallest: MP4 (H.264 and AAC) plays in every browser, so it
// comes first. Safari and recent Chrome and Edge record it. Firefox records only WebM/Ogg with Opus, which the
// other browsers play as well.
const VOICE_TYPES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm',
];

const VIDEO_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/mp4',
  'video/webm',
];

// The best format this browser can record, or '' to let it choose.
export const pickRecordingType = (video: boolean): string => (video ? VIDEO_TYPES : VOICE_TYPES)
  .find(type => MediaRecorder.isTypeSupported(type)) ?? '';
