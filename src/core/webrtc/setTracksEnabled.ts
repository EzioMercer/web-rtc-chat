import { media } from './state.ts';
import { TrackKind } from './TrackKind.ts';

// Mutes/unmutes local audio or video tracks without renegotiating.
export const setTracksEnabled = (kind: TrackKind, enabled: boolean) => {
  media.localStream?.getTracks()
    .filter(track => track.kind === kind)
    .forEach((track) => {
      track.enabled = enabled;
    });
};
