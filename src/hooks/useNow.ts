import { useEffect, useState } from 'react';

// The time now, updated every `every` ms while `active` (for texts like "updated 2 min ago").
export const useNow = (every: number, active = true): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = window.setInterval(() => setNow(Date.now()), every);

    return () => window.clearInterval(timer);
  }, [every, active]);

  return now;
};
