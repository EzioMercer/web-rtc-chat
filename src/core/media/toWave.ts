import { WAVE_BARS } from './config.ts';

// Quieter than this is silence: a silent recording stays flat instead of being scaled up to full height.
const QUIET = 0.02;

// Turns loudness samples (0-1) into `WAVE_BARS` bars of 0-31, scaled so the loudest bar is full height.
export const toWave = (levels: number[]): number[] => {
  if (!levels.length) {
    return [];
  }

  const bars = Array.from({ length: WAVE_BARS }, (_, i) => {
    const start = Math.floor((i * levels.length) / WAVE_BARS);
    const end = Math.max(start + 1, Math.floor(((i + 1) * levels.length) / WAVE_BARS));
    const part = levels.slice(start, Math.min(end, levels.length));

    return part.reduce((sum, level) => sum + level, 0) / Math.max(part.length, 1);
  });
  const loudest = Math.max(QUIET, ...bars);

  return bars.map(bar => Math.round(Math.min(1, bar / loudest) * 31));
};
