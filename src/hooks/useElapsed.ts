import { useEffect, useState } from 'react';

// Milliseconds since `since`, updated a few times a second.
export const useElapsed = (since: number | null): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since === null) {
      return undefined;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(timer);
  }, [since]);

  return since === null ? 0 : Math.max(0, now - since);
};
