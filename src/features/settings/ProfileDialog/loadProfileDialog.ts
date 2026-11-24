let loading: Promise<typeof import('./ProfileDialog.tsx')> | null = null;

// Loads the Profile info window's code (the phone number's checks and the flags are big, so they aren't in the app's
// first load). Settings starts it as soon as it opens, so the window is there by the time it is tapped. Once only;
// a failed load (offline) is tried again next time.
export const loadProfileDialog = () => {
  loading ??= import('./ProfileDialog.tsx').catch((err: unknown) => {
    loading = null;
    throw err;
  });

  return loading;
};
