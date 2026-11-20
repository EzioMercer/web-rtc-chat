import { useEffect, useState } from 'react';
import { fetchVersion } from '../update/fetchVersion.ts';

const CHECK_MS = 30 * 60_000;

// A newer version of the app that the site serves, or null. Checked every 30 minutes and when coming back to the
// tab. Nothing changes on its own: reloading is up to the user.
export const useNewVersion = (): string | null => {
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    // The dev server has no version.json.
    if (import.meta.env.DEV) {
      return;
    }

    const check = () => {
      fetchVersion()
        .then(version => version && version !== __APP_VERSION__ && setLatest(version))
        .catch(() => undefined);
    };

    const onVisible = () => !document.hidden && check();

    const timer = window.setInterval(check, CHECK_MS);

    check();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return latest;
};
