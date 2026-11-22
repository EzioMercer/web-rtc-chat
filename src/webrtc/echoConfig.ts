// Echo guard and echo detection (see useEchoGuard and useEchoDetector). Levels are 0-1, as the browser reports them.

// Sound levels are read this often.
export const ECHO_SAMPLE_MS = 100;

// Louder than this is someone talking (about -36 dB); quieter is room noise after the browser's noise filter.
export const TALK_LEVEL = 0.016;

// Echo guard: the microphone opens again this long after they stop talking, so the last of their voice still
// coming out of the speaker doesn't go back to them.
export const GUARD_HANGOVER_MS = 600;

// Echo detection compares the last this many samples (15 s)...
export const ECHO_WINDOW = 150;
// ...looking for our voice coming back after 0.1-1.5 s (there and back over the network, plus the phone's sound
// buffers).
export const ECHO_MIN_LAG = 1;
export const ECHO_MAX_LAG = 15;
// We must have talked at least this many samples (1.5 s) in the window to judge.
export const ECHO_MIN_TALK = 15;
// What comes back must follow our voice this closely (correlation, 0-1)... A real echo measured 0.95; two people
// talking normally stayed under 0.65 (the browser smooths the levels, so any two voices match a little).
export const ECHO_MATCH = 0.8;
// ...and clearly more closely late than at once (both talking at the same time matches at once, an echo only late).
export const ECHO_LATE_MARGIN = 0.15;
// The first samples of a call are skipped: both sides start sending at the same moment, which looks alike.
export const ECHO_SKIP = 30;
// It is checked every second; this many checks in a row must find an echo before the other side is told.
export const ECHO_CHECKS = 3;
