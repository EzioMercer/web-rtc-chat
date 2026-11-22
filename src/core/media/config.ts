// Voice and video messages. Small on purpose: through the TURN relay every byte is paid for, so with these settings
// 10 MB holds about 25 minutes of voice or 2 minutes of video. Both sound and look like in popular chat apps.

// Voice: Opus is clear at 32 kbps; AAC (used where the browser records MP4) needs a bit more.
export const OPUS_BITRATE = 32_000;
export const AAC_BITRATE = 48_000;

// Round video messages: a square picture this many pixels wide, at this frame rate and bitrate.
export const VIDEO_NOTE_SIZE = 384;
export const VIDEO_NOTE_FPS = 30;
export const VIDEO_NOTE_BITRATE = 600_000;

// Like popular chat apps, a video message is at most a minute long.
export const VIDEO_NOTE_MAX_MS = 60_000;

// Shorter recordings are dropped (the button was let go by accident).
export const MIN_NOTE_MS = 700;

// The recorder hands over what it has recorded this often, so the size is known while recording.
export const RECORDER_SLICE_MS = 1000;

// Through the TURN relay, recording stops this far below the size limit (one more slice still comes).
export const RELAY_STOP_MARGIN = 256 * 1024;

// How often the microphone's loudness is measured, and how many bars a voice message's waveform has.
export const LEVEL_SAMPLE_MS = 50;
export const WAVE_BARS = 40;
