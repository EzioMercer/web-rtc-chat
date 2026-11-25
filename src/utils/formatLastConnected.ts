import { formatClock } from './formatClock.ts';
import { startOfDay } from './startOfDay.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const YEAR_MONTHS = 12;

const ago = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'} ago`;

// Whole calendar months from one day to another. A month has passed on the same date of the next month, or on its
// last day when that month is shorter (31 January to 28 February), so months of 28 to 31 days all count as one.
const monthsBetween = (from: Date, to: Date) => {
  const months = (to.getFullYear() - from.getFullYear()) * YEAR_MONTHS + to.getMonth() - from.getMonth();
  const lastDay = new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate();

  return to.getDate() >= Math.min(from.getDate(), lastDay) ? months : months - 1;
};

// When we were last connected to a contact, as other messengers show "last seen": the time today, "yesterday",
// exact days in the last week, then whole weeks until a calendar month has passed, then months, then years. Counted
// in calendar days of the device's time zone; `today` is the start of today (see startOfDay).
export const formatLastConnected = (at: number, today: number): string => {
  // Rounded: a day with a clock change is an hour shorter or longer.
  const days = Math.round((today - startOfDay(at)) / DAY_MS);

  // Today, or a time ahead of this device's clock.
  if (days <= 0) {
    return `last connected at ${formatClock(at)}`;
  }

  if (days === 1) {
    return 'last connected yesterday';
  }

  if (days < WEEK_DAYS) {
    return `last connected ${ago(days, 'day')}`;
  }

  const months = monthsBetween(new Date(at), new Date(today));

  if (months >= YEAR_MONTHS) {
    return `last connected ${ago(Math.floor(months / YEAR_MONTHS), 'year')}`;
  }

  if (months >= 1) {
    return `last connected ${ago(months, 'month')}`;
  }

  return `last connected ${ago(Math.floor(days / WEEK_DAYS), 'week')}`;
};
