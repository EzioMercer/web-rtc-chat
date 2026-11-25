import { startOfDay } from './startOfDay.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

// The days before today that are named by their weekday; older ones get a date.
const WEEKDAY_DAYS = 6;

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

// The day a message was written, in the device's own language and time zone, as other messengers show it above that
// day's messages: "Today", "Yesterday", the weekday within the last week, then "25 November" (with the year if it
// isn't this year). `today` is the start of today (see startOfDay).
export const formatDay = (at: number, today: number): string => {
  const day = startOfDay(at);
  // Rounded: a day with a clock change is an hour shorter or longer.
  const ago = Math.round((today - day) / DAY_MS);

  if (ago === 0 || ago === 1) {
    return capitalize(new Intl.RelativeTimeFormat([], { numeric: 'auto' }).format(-ago, 'day'));
  }

  if (ago > 1 && ago <= WEEKDAY_DAYS) {
    return capitalize(new Date(at).toLocaleDateString([], { weekday: 'long' }));
  }

  const sameYear = new Date(at).getFullYear() === new Date(today).getFullYear();
  const year = sameYear ? {} : { year: 'numeric' as const };

  return new Date(at).toLocaleDateString([], { day: 'numeric', month: 'long', ...year });
};
