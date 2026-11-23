export const STORAGE_KEYS = {
  meta: 'meta',
  contacts: 'contacts',
  // Our key for each contact, by contact id, each encrypted with the vault key.
  keys: 'keys',
  settings: 'settings',
  // What our contacts see of us (see ProfileState).
  profile: 'profile',
  deviceKey: 'deviceKey',
} as const;
