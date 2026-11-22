import { ECHO_MAX_LAG, ECHO_MIN_LAG } from './echoConfig.ts';

// Levels in decibels mapped to 0-1 (-60 dB and below -> 0, 0 dB -> 1), so a quiet echo counts as much as a loud one.
const toDb = (level: number) => (level <= 0.001 ? 0 : (Math.log10(level) + 3) / 3);

// Pearson correlation of local[i - lag] with remote[i]: 1 when what we hear follows what we said `lag` samples ago.
const correlate = (local: number[], remote: number[], lag: number): number => {
  const xs = local.slice(0, local.length - lag);
  const ys = remote.slice(lag);

  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  const mx = mean(xs);
  const my = mean(ys);
  let xy = 0;
  let xx = 0;
  let yy = 0;

  xs.forEach((x, i) => {
    xy += (x - mx) * (ys[i] - my);
    xx += (x - mx) ** 2;
    yy += (ys[i] - my) ** 2;
  });

  return xx && yy ? xy / Math.sqrt(xx * yy) : 0;
};

// How closely the sound we hear follows our own voice a moment later (`late`, the best of the possible delays) and
// at the same time (`now`). Both lists are sound levels, sampled at the same moments.
export const findEchoMatch = (local: number[], remote: number[]): { late: number; now: number } => {
  const x = local.map(toDb);
  const y = remote.map(toDb);
  let late = 0;

  for (let lag = ECHO_MIN_LAG; lag <= ECHO_MAX_LAG; lag += 1) {
    late = Math.max(late, correlate(x, y, lag));
  }

  return { late, now: correlate(x, y, 0) };
};
