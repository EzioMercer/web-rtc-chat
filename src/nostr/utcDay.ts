const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-11-19" for today (UTC), shifted by `offset` days.
export const utcDay = (offset = 0): string => new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);
