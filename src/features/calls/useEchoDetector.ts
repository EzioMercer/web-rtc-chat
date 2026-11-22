import { useEffect } from 'react';
import {
  ECHO_CHECKS,
  ECHO_LATE_MARGIN,
  ECHO_MATCH,
  ECHO_MIN_TALK,
  ECHO_SAMPLE_MS,
  ECHO_SKIP,
  ECHO_WINDOW,
  TALK_LEVEL,
} from '../../core/webrtc/echoConfig.ts';
import { findEchoMatch } from '../../core/webrtc/findEchoMatch.ts';
import { readAudioLevels } from '../../core/webrtc/readAudioLevels.ts';
import { sendControl } from '../../core/webrtc/sendControl.ts';
import { sessions } from '../../core/webrtc/state.ts';

const CHECK_EVERY = 1000 / ECHO_SAMPLE_MS;

// Right after the call starts the microphone's entry may not be there yet; after this many samples without it, the
// browser doesn't report it.
const GIVE_UP_SAMPLES = 50;

// Listens for an echo of our own voice in what they send: our voice coming back a moment later, with the same
// rhythm. When it keeps happening, tells them once per call, so their app can offer them the echo guard (the echo
// comes from their speaker, so only their side can stop it). Needs the browser to report our microphone's level;
// where it doesn't, this does nothing.
export const useEchoDetector = (key: string | null, running: boolean) => {
  useEffect(() => {
    if (!key || !running) {
      return undefined;
    }

    const local: number[] = [];
    const remote: number[] = [];
    let samples = 0;
    let missing = 0;
    let hits = 0;
    let busy = false;
    let timer = 0;

    const check = () => {
      const talked = local.filter(level => level >= TALK_LEVEL).length;

      if (local.length < ECHO_WINDOW / 3 || talked < ECHO_MIN_TALK) {
        hits = 0;

        return;
      }

      const { late, now } = findEchoMatch(local, remote);

      hits = late >= ECHO_MATCH && late - now >= ECHO_LATE_MARGIN ? hits + 1 : 0;

      if (hits >= ECHO_CHECKS) {
        window.clearInterval(timer);
        sessions.get(key)?.log(`Echo: we hear our own voice back (match ${late.toFixed(2)}); told them.`);
        sendControl(key, { t: 'call', action: 'echo' });
      }
    };

    const tick = async () => {
      const session = sessions.get(key);

      if (busy || !session) {
        return;
      }

      busy = true;

      try {
        // Null while the connection is closing (the effect cleans up then).
        const levels = await readAudioLevels(session).catch(() => null);

        if (!levels) {
          return;
        }

        if (levels.local === null) {
          missing += 1;

          // This browser doesn't report our microphone's level: nothing to compare.
          if (missing >= GIVE_UP_SAMPLES && !local.length) {
            window.clearInterval(timer);
          }

          return;
        }

        samples += 1;

        if (samples <= ECHO_SKIP) {
          return;
        }

        local.push(levels.local);
        remote.push(levels.remote ?? 0);

        if (local.length > ECHO_WINDOW) {
          local.shift();
          remote.shift();
        }

        if (samples % CHECK_EVERY === 0) {
          check();
        }
      } finally {
        busy = false;
      }
    };

    timer = window.setInterval(() => void tick(), ECHO_SAMPLE_MS);

    return () => window.clearInterval(timer);
  }, [key, running]);
};
