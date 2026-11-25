import { MIN_BIRTH_YEAR } from './config.ts';

// A birthday as we save and send it: "2001-02-28", or "--02-28" without the year (ISO 8601's form for that). The day
// must exist in that month (29 February only in a leap year, or with no year), and the year can't be before
// MIN_BIRTH_YEAR or after this one.
export const isBirthday = (value: unknown): value is string => {
  const match = typeof value === 'string' ? /^(?:(\d{4})|-)-(\d{2})-(\d{2})$/.exec(value) : null;

  if (!match) {
    return false;
  }

  const year = match[1] === undefined ? null : Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year !== null && (year < MIN_BIRTH_YEAR || year > new Date().getFullYear())) {
    return false;
  }

  // Day 0 of the next month is the last day of this one; 2000 is a leap year, for a birthday with no year.
  const days = new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate();

  return month >= 1 && month <= 12 && day >= 1 && day <= days;
};
