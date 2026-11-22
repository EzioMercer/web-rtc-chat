export const STORAGE_KEYS = {
  meta: 'meta',
  contacts: 'contacts',
  // Our key for each contact, by contact id, each encrypted with the vault key.
  keys: 'keys',
  settings: 'settings',
  deviceKey: 'deviceKey',
} as const;
