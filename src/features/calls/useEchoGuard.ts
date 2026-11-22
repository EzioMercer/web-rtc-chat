import { useEffect } from 'react';
import { useStore } from 'react-redux';
import type { RootState } from '../../store/store.ts';
import { ECHO_SAMPLE_MS, GUARD_HANGOVER_MS, TALK_LEVEL } from '../../core/webrtc/echoConfig.ts';
import { readAudioLevels } from '../../core/webrtc/readAudioLevels.ts';
import { setTracksEnabled } from '../../core/webrtc/setTracksEnabled.ts';
import { sessions } from '../../core/webrtc/state.ts';

// Echo guard: while they talk, our microphone is off, so their voice coming out of our speaker can't go back to them
// as an echo. It opens again shortly after they stop. Runs only while `running` (a call, the guard on, not muted).
// It switches the microphone track itself, so they don't see us as "muted".
export const useEchoGuard = (key: string | null, running: boolean) => {
  const store = useStore<RootState>();

  useEffect(() => {
    if (!key || !running) {
      return undefined;
    }

    let lastTalk = 0;
    let closed = false;
    let busy = false;

    const setClosed = (close: boolean) => {
      if (close !== closed) {
        closed = close;
        setTracksEnabled('audio', !close && store.getState().call.mic);
      }
    };

    const tick = async () => {
      const session = sessions.get(key);

      if (busy || !session) {
        return;
      }

      busy = true;

      try {
        const { remote } = await readAudioLevels(session);
        const now = performance.now();

        if ((remote ?? 0) >= TALK_LEVEL) {
          lastTalk = now;
        }

        setClosed(now - lastTalk < GUARD_HANGOVER_MS);
      } catch {
        setClosed(false);
      } finally {
        busy = false;
      }
    };

    const timer = window.setInterval(() => void tick(), ECHO_SAMPLE_MS);

    return () => {
      window.clearInterval(timer);

      if (closed) {
        setTracksEnabled('audio', store.getState().call.mic);
      }
    };
  }, [key, running, store]);
};
