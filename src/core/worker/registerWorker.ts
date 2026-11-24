// The service worker that streams backup downloads to disk (public/backup-sw.js). Registered at start, so it is
// ready when a backup is made. Without it (e.g. a private window in some browsers) backups are built in memory.
export const registerDownloadWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}backup-sw.js`).catch(() => undefined);
  }
};
