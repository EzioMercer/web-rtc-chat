import { MAX_ABOUT_CHARS } from './config.ts';

// A description as we save and send it.
export const isAbout = (value: unknown): value is string => (
  typeof value === 'string' && value.length <= MAX_ABOUT_CHARS
);
