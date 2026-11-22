// 9:05 for 545 seconds.
export const formatRemaining = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
