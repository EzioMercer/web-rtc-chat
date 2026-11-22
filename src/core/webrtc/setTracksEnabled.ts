import { media } from './state.ts';

// Mutes/unmutes local audio or video tracks without renegotiating.
export const setTracksEnabled = (kind: 'audio' | 'video', enabled: boolean) => {
  media.localStream?.getTracks()
    .filter(track => track.kind === kind)
    .forEach((track) => {
      track.enabled = enabled;
    });
};
