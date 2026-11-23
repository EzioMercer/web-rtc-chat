// 20000 ms -> "20 s ago"; "just now" under 10 s.
export const formatAgo = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000));

  if (seconds < 10) {
    return 'just now';
  }

  if (seconds < 60) {
    return `${Math.floor(seconds / 10) * 10} s ago`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }

  return `${Math.floor(seconds / 3600)} h ago`;
};
