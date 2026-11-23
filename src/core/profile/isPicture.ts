import { MAX_PICTURE_CHARS } from './config.ts';

// A picture as makePicture makes it, or as a contact may send it: a small JPEG, PNG or WebP data URL, nothing else
// (no SVG, which can hold scripts and links).
export const isPicture = (value: unknown): value is string => typeof value === 'string'
  && value.length <= MAX_PICTURE_CHARS
  && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
