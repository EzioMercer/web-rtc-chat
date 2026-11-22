import { media } from './state.ts';
import type { Session } from './types.ts';

type Stat = {
  type: string;
  kind?: string;
  trackIdentifier?: string;
  audioLevel?: number;
};

export type AudioLevels = {
  // How loud our microphone is (after the browser's echo filter), 0-1. Null where the browser doesn't say (Firefox
  // on Android).
  local: number | null;
  // How loud their voice is as we play it, 0-1. Every browser says.
  remote: number | null;
};

// Reads the call's sound levels from the connection's statistics: no extra sound processing, which on phones could
// move the call to the music path and break their echo filter (see ringtone.ts).
export const readAudioLevels = async (session: Session): Promise<AudioLevels> => {
  const remoteId = session.remoteStream?.getAudioTracks()[0]?.id;
  const localId = media.localStream?.getAudioTracks()[0]?.id;
  const report = await session.peer.getStats();
  const levels: AudioLevels = { local: null, remote: null };

  // An earlier call can leave its own entries behind: prefer the ones for this call's tracks.
  report.forEach((stat: Stat) => {
    if (stat.kind !== 'audio' || typeof stat.audioLevel !== 'number') {
      return;
    }

    if (stat.type === 'inbound-rtp' && (levels.remote === null || stat.trackIdentifier === remoteId)) {
      levels.remote = stat.audioLevel;
    } else if (stat.type === 'media-source' && (levels.local === null || stat.trackIdentifier === localId)) {
      levels.local = stat.audioLevel;
    }
  });

  return levels;
};
