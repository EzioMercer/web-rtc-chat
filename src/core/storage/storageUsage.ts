// How much this site stores, and how much more the browser allows (both estimates, in bytes), or null if the browser
// can't tell.
export const storageUsage = async (): Promise<{ used: number; free: number } | null> => {
  try {
    const { usage, quota } = await navigator.storage.estimate();

    if (usage === undefined || quota === undefined) {
      return null;
    }

    return { used: usage, free: Math.max(0, quota - usage) };
  } catch {
    return null;
  }
};
