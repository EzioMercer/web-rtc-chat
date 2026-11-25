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

// The longest description of ourselves (in UTF-16 units, as the text box counts them).
export const MAX_ABOUT_CHARS = 150;

// The most digits the phone number field takes after the country code: the longest numbers have 15 digits in all
// (country code included), and one more for the leading 0 some countries write.
export const MAX_PHONE_DIGITS = 15;

// The earliest birth year the birthday field takes.
export const MIN_BIRTH_YEAR = 1900;
