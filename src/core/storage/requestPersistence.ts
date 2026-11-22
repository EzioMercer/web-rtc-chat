// Asks the browser not to delete this site's data when the device runs low on space. Browsers decide on their own
// (an installed app, or one used often, usually gets it); returns whether the data is protected now.
export const requestPersistence = async (): Promise<boolean> => {
  try {
    return await navigator.storage.persisted() || await navigator.storage.persist();
  } catch {
    return false;
  }
};
