// The time of day in the user's own format, e.g. "14:30" or "2:30 PM".
export const formatClock = (at: number): string => new Date(at).toLocaleTimeString([], {
  hour: 'numeric',
  minute: '2-digit',
});
