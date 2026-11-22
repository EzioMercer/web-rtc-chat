// Contact id -> the slot its saved chat lives in (see historyKeys). Memory copy of the saved list; `version` counts
// changes and `saved` is the version last written.
export const slots = {
  map: new Map<string, string>(),
  version: 0,
  saved: 0,
};
