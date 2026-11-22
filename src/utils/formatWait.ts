// 95000 ms -> "about 2 min"; short waits are "a few seconds".
export const formatWait = (ms: number): string => {
  const seconds = ms / 1000;

  if (seconds < 10) {
    return 'a few seconds';
  }

  if (seconds < 60) {
    return `about ${Math.round(seconds / 10) * 10} s`;
  }

  if (seconds < 3600) {
    return `about ${Math.round(seconds / 60)} min`;
  }

  return `about ${(seconds / 3600).toFixed(1)} h`;
};
