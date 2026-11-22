// Keeps the screen from turning off (which pauses the page on phones) until the returned function is called.
// Does nothing where the browser can't.
export const keepScreenOn = async (): Promise<() => void> => {
  try {
    const lock = await navigator.wakeLock.request('screen');

    return () => void lock.release().catch(() => undefined);
  } catch {
    return () => undefined;
  }
};
