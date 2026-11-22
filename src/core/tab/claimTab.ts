// Held by the one tab that runs the app; released only when that tab closes.
const LOCK = 'web-rtc-chat-tab';

// Resolves once this tab may run the app. If another tab runs it, `onWaiting` is called and this waits until that
// tab closes: two tabs would both save the same chats and both answer contacts. Browsers without Web Locks run
// anyway.
export const claimTab = async (onWaiting: () => void): Promise<void> => {
  if (!('locks' in navigator)) {
    return;
  }

  const hold = () => new Promise<never>(() => undefined);

  const got = await new Promise<boolean>((resolve) => {
    void navigator.locks.request(LOCK, { ifAvailable: true }, (lock) => {
      resolve(lock !== null);

      return lock ? hold() : undefined;
    });
  });

  if (got) {
    return;
  }

  onWaiting();
  await new Promise<void>((resolve) => {
    void navigator.locks.request(LOCK, () => {
      resolve();

      return hold();
    });
  });
};
