// Our picture is cropped to a square of this many pixels: sharp enough for the call screen on a phone.
export const PICTURE_SIZE = 256;

// A photo is first drawn at most this many times PICTURE_SIZE (phones limit how big a canvas can be), then halved
// step by step: one big step down looks grainy in some browsers.
export const PICTURE_FIRST_STEP = 4;

// JPEG quality of the picture, tried in this order until it fits in MAX_PICTURE_CHARS.
export const PICTURE_QUALITIES = [0.85, 0.7, 0.55, 0.4];

// The longest picture (as a data URL) we send or accept. It goes in one control channel message, which every
// browser carries up to 256 KB.
export const MAX_PICTURE_CHARS = 64_000;
