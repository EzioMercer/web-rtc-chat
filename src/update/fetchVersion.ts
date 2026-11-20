// The version of the app the site serves now (see vite.config.ts).
export const fetchVersion = async (): Promise<string | null> => {
  const response = await fetch(`${import.meta.env.BASE_URL}version.json`, {
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });

  if (!response.ok) {
    return null;
  }

  const body = await response.json() as { version?: unknown };

  return typeof body.version === 'string' ? body.version : null;
};
