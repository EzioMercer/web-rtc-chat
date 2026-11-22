// The browser's built-in "deflate-raw": the same compression as zip files, without the zip header (a few bytes less).
export const FORMAT = 'deflate-raw';

// Unzipped connection notes and manual codes are a few KB; anything bigger is not from this app (a "zip bomb" that
// would unpack into gigabytes is stopped here).
export const MAX_TEXT_BYTES = 200_000;

// Files are zipped only if that saves at least this share of their size; otherwise they go as they are.
export const MIN_FILE_SAVING = 0.1;

// Smaller files are never zipped: there is nothing worth saving.
export const MIN_FILE_BYTES = 1024;
