// The app's service worker (public/sw.js): keeps the app's files, so it opens offline, and streams backup downloads
// to disk. Registered at start. Without it (e.g. a private window in some browsers) the app needs the network to
// open and backups are built in memory.
export const registerWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  }
};
