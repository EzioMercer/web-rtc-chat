// How long a live location still runs: "42 min", "1 h 20 min", "under a minute" (rounded up, so it never says 0).
export const formatLeft = (ms: number): string => {
  const minutes = Math.ceil(ms / 60_000);

  if (minutes <= 1) {
    return '1 min';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const rest = minutes % 60;

  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${minutes / 60} h`;
};
