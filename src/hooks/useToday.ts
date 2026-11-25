import { useEffect, useState } from 'react';
import { startOfDay } from '../utils/startOfDay.ts';

// A moment after midnight, so the new day has surely begun.
const AFTER_MIDNIGHT_MS = 1000;

// The start of today (see startOfDay), changing at midnight, so "Today" becomes "Yesterday" on its own.
export const useToday = () => {
  const [today, setToday] = useState(() => startOfDay(Date.now()));

  useEffect(() => {
    const tomorrow = new Date(today);

    tomorrow.setDate(tomorrow.getDate() + 1);

    const timer = window.setTimeout(
      () => setToday(startOfDay(Date.now())),
      tomorrow.getTime() - Date.now() + AFTER_MIDNIGHT_MS,
    );

    return () => window.clearTimeout(timer);
  }, [today]);

  return today;
};
