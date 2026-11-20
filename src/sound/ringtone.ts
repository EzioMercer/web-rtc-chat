// Call sounds, made with Web Audio (no sound files): a ringtone for incoming calls and a ringback tone while
// calling someone, like a phone.

type Note = { at: number; freq: number };

// Incoming: a short marimba-like tune (E major arpeggio), repeated every 3 seconds.
const TUNE: Note[] = [
  { at: 0, freq: 659.25 },
  { at: 0.15, freq: 830.61 },
  { at: 0.3, freq: 987.77 },
  { at: 0.45, freq: 1318.51 },
  { at: 0.75, freq: 987.77 },
  { at: 0.9, freq: 1318.51 },
];
const TUNE_EVERY_S = 3;

// Outgoing: the classic ringback tone (440 + 480 Hz), 2 seconds on, 4 off.
const RINGBACK_ON_S = 2;
const RINGBACK_EVERY_S = 6;

// Sounds are queued this far ahead and topped up every few seconds, so a background tab (whose timers the
// browser slows down) still rings without gaps.
const AHEAD_S = 90;
const TOP_UP_MS = 5000;

export type Ring = 'incoming' | 'outgoing';

let context: AudioContext | null = null;
let ringing: { output: GainNode; sources: Set<AudioScheduledSourceNode>; timer: number; until: number } | null = null;

const getContext = () => {
  context ??= new AudioContext();

  return context;
};

// A bell-like note: a few sine partials that fade out quickly.
const playNote = (ctx: AudioContext, output: AudioNode, freq: number, at: number): AudioScheduledSourceNode[] => (
  [[1, 1], [2.76, 0.25], [5.4, 0.08]].map(([ratio, level]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq * ratio;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9 / ratio);
    osc.connect(gain).connect(output);
    osc.start(at);
    osc.stop(at + 1);

    return osc;
  })
);

const playTone = (ctx: AudioContext, output: AudioNode, at: number): AudioScheduledSourceNode[] => {
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.5, at + 0.02);
  gain.gain.setValueAtTime(0.5, at + RINGBACK_ON_S - 0.02);
  gain.gain.linearRampToValueAtTime(0, at + RINGBACK_ON_S);
  gain.connect(output);

  return [440, 480].map((freq) => {
    const osc = ctx.createOscillator();

    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + RINGBACK_ON_S);

    return osc;
  });
};

// Queues repetitions of the sound up to AHEAD_S from now.
const queue = (ring: Ring) => {
  if (!ringing || !context) {
    return;
  }

  const every = ring === 'incoming' ? TUNE_EVERY_S : RINGBACK_EVERY_S;
  const end = context.currentTime + AHEAD_S;

  while (ringing.until < end) {
    const at = ringing.until;
    const added = ring === 'incoming'
      ? TUNE.flatMap(note => playNote(context!, ringing!.output, note.freq, at + note.at))
      : playTone(context, ringing.output, at);

    const { sources } = ringing;

    added.forEach((source) => {
      sources.add(source);
      source.onended = () => sources.delete(source);
    });
    ringing.until += every;
  }
};

export const stopRinging = () => {
  if (!ringing) {
    return;
  }

  window.clearInterval(ringing.timer);
  // Every sound was started when queued, so stop() can't throw.
  ringing.sources.forEach(source => source.stop());
  ringing.output.disconnect();
  ringing = null;
  navigator.vibrate?.(0);
};

export const startRinging = (ring: Ring) => {
  stopRinging();

  const ctx = getContext();
  const output = ctx.createGain();

  // Browsers may keep audio off until the user has clicked the page; then it's silent (the call still shows).
  void ctx.resume().catch(() => undefined);
  output.gain.value = ring === 'incoming' ? 0.25 : 0.15;
  output.connect(ctx.destination);
  ringing = { output, sources: new Set(), timer: 0, until: ctx.currentTime + 0.05 };
  ringing.timer = window.setInterval(() => queue(ring), TOP_UP_MS);
  queue(ring);

  if (ring === 'incoming') {
    // Phones also vibrate (where the browser allows it): 1 s on, 2 off, for about a minute.
    navigator.vibrate?.(Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 1000 : 2000)));
  }
};

// Audio may only start after the user interacts with the page. Prepare it on the first click or key press, so a
// call that comes in later can ring.
export const unlockSound = () => {
  const unlock = () => {
    void getContext().resume().catch(() => undefined);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
};
