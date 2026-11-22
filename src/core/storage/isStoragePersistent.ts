// Whether the browser promised not to delete this site's data on its own (see requestPersistence).
export const isStoragePersistent = async (): Promise<boolean> => {
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
};
