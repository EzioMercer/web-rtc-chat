import { LEVEL_SAMPLE_MS } from './config.ts';

export type Meter = {
  // Every measurement so far, 0-1.
  levels: number[];
  // The latest one.
  now: () => number;
  stop: () => void;
};

// Measures the microphone's loudness while recording: for the live indicator and the voice message's waveform.
// Without Web Audio it measures nothing, and the recording still works.
export const meterLevels = (stream: MediaStream): Meter => {
  const levels: number[] = [];

  try {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    const data = new Float32Array(analyser.fftSize);

    context.createMediaStreamSource(stream).connect(analyser);
    // Safari starts it paused when it is not created right in a tap. A quick stop closes it before it has started,
    // which fails the start: nothing to do then.
    context.resume().catch(() => undefined);

    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(data);

      // Root mean square: how loud this moment is.
      const power = data.reduce((sum, sample) => sum + sample * sample, 0) / data.length;

      levels.push(Math.sqrt(power));
    }, LEVEL_SAMPLE_MS);

    return {
      levels,
      now: () => levels.at(-1) ?? 0,
      stop: () => {
        window.clearInterval(timer);
        context.close().catch(() => undefined);
      },
    };
  } catch {
    return { levels, now: () => 0, stop: () => undefined };
  }
};
