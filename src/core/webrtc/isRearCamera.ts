// Whether `track` comes from a phone's back camera. Computers' cameras don't say, and count as front ones.
export const isRearCamera = (track: MediaStreamTrack) => track.getSettings().facingMode === 'environment';
