import { useEffect, useEffectEvent, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { MIN_NOTE_MS, RELAY_STOP_MARGIN, VIDEO_NOTE_MAX_MS } from '../../core/media/config.ts';
import { recordErrorText } from '../../core/media/recordErrorText.ts';
import { startRecorder, type Recorder } from '../../core/media/startRecorder.ts';
import { addMessage } from '../../store/chat/chatSlice.ts';
import { MessageAuthor, NoteType } from '../../store/chat/types.ts';
import { sendNote } from '../../store/thunks/chat/sendNote.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { overRelayLimit } from '../../core/webrtc/overRelayLimit.ts';
import { sessions } from '../../core/webrtc/state.ts';
import { RecordPhase } from './RecordPhase.ts';

// The press on the button: the one that started recording, or (when locked) a new one that sends.
enum Press {
  None,
  Hold,
  Send,
}

// A press shorter than this is a tap (it switches between voice and video); holding longer starts recording.
const HOLD_MS = 250;

// While holding: slide this far left to throw the recording away, or this far up to lock it.
export const CANCEL_PX = 110;
export const LOCK_PX = 80;

// How long the "Hold to record…" tip stays after a tap.
const HINT_MS = 2500;

type Live = {
  phase: RecordPhase;
  recorder: Recorder | null;
  // Bumped whenever a recording starts or ends, so a slow start that is no longer wanted is thrown away.
  attempt: number;
  holdTimer: number;
  maxTimer: number;
  hintTimer: number;
  press: Press;
  startX: number;
  startY: number;
};

// Voice and video messages, like popular chat apps: tap the button to switch between voice and video, hold it to
// record, let go to send. While holding, slide left to cancel or up to keep recording without holding.
// Works the same with a mouse; Escape cancels.
export const useRecording = (convKey: string) => {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState(NoteType.Voice);
  const [phase, setPhaseState] = useState<RecordPhase>(RecordPhase.Idle);
  const [recorder, setRecorder] = useState<Recorder | null>(null);
  const [slide, setSlide] = useState({ x: 0, y: 0 });
  const [hint, setHint] = useState<string | null>(null);
  const live = useRef<Live>({
    phase: RecordPhase.Idle,
    recorder: null,
    attempt: 0,
    holdTimer: 0,
    maxTimer: 0,
    hintTimer: 0,
    press: Press.None,
    startX: 0,
    startY: 0,
  });

  const setPhase = (next: RecordPhase) => {
    live.current.phase = next;
    setPhaseState(next);
  };

  const showHint = (text: string | null) => {
    window.clearTimeout(live.current.hintTimer);
    setHint(text);

    if (text) {
      live.current.hintTimer = window.setTimeout(() => setHint(null), HINT_MS);
    }
  };

  // Back to idle; returns the recorder that was running, if any.
  const reset = () => {
    const state = live.current;
    const running = state.recorder;

    window.clearTimeout(state.holdTimer);
    window.clearTimeout(state.maxTimer);
    state.holdTimer = 0;
    state.attempt += 1;
    state.recorder = null;
    setRecorder(null);
    setSlide({ x: 0, y: 0 });
    setPhase(RecordPhase.Idle);

    return running;
  };

  const cancel = () => reset()?.cancel();

  const send = async () => {
    const running = reset();

    if (!running) {
      return;
    }

    const recording = await running.stop();

    if (recording.duration < MIN_NOTE_MS) {
      showHint(`Hold to record a ${running.video ? 'video' : 'voice'} message`);

      return;
    }

    await dispatch(sendNote(convKey, running.video ? NoteType.Video : NoteType.Voice, recording));
  };

  const begin = async () => {
    const state = live.current;
    const video = mode === NoteType.Video;

    state.holdTimer = 0;
    state.attempt += 1;

    const attempt = state.attempt;

    setPhase(RecordPhase.Starting);
    showHint(null);

    // Through the TURN relay, stop (and send) just before the size limit.
    const onSize = (bytes: number) => {
      if (overRelayLimit(sessions.get(convKey), bytes + RELAY_STOP_MARGIN)) {
        void send();
      }
    };

    try {
      const started = await startRecorder(video, onSize);

      // Let go or cancelled while the microphone was starting (or while the browser asked for permission).
      if (attempt !== state.attempt) {
        started.cancel();

        return;
      }

      state.recorder = started;
      setRecorder(started);
      setPhase(state.press === Press.Hold ? RecordPhase.Recording : RecordPhase.Locked);

      if (video) {
        state.maxTimer = window.setTimeout(() => void send(), VIDEO_NOTE_MAX_MS);
      }
    } catch (err) {
      if (attempt === state.attempt) {
        reset();
        dispatch(addMessage({ key: convKey, from: MessageAuthor.System, text: recordErrorText(err, video) }));
      }
    }
  };

  const toggleMode = () => {
    const next = mode === NoteType.Voice ? NoteType.Video : NoteType.Voice;

    setMode(next);
    showHint(`Hold to record a ${next} message`);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const state = live.current;

    if (e.button !== 0) {
      return;
    }

    if (state.phase === RecordPhase.Locked) {
      state.press = Press.Send;

      return;
    }

    if (state.phase !== RecordPhase.Idle) {
      return;
    }

    // Keep getting the moves and the release even when the finger leaves the button.
    e.currentTarget.setPointerCapture(e.pointerId);
    state.press = Press.Hold;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.holdTimer = window.setTimeout(() => void begin(), HOLD_MS);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const state = live.current;

    if (state.press !== Press.Hold || (state.phase !== RecordPhase.Recording && state.phase !== RecordPhase.Starting)) {
      return;
    }

    const x = Math.max(0, state.startX - e.clientX);
    const y = Math.max(0, state.startY - e.clientY);

    if (x > CANCEL_PX) {
      state.press = Press.None;
      cancel();
    } else if (y > LOCK_PX && state.phase === RecordPhase.Recording) {
      setPhase(RecordPhase.Locked);
      setSlide({ x: 0, y: 0 });
    } else {
      setSlide(x > y ? { x, y: 0 } : { x: 0, y });
    }
  };

  const onPointerUp = () => {
    const state = live.current;
    const press = state.press;

    state.press = Press.None;

    if (state.holdTimer) {
      window.clearTimeout(state.holdTimer);
      state.holdTimer = 0;
      toggleMode();
    } else if (press === Press.Send && state.phase === RecordPhase.Locked) {
      void send();
    } else if (press === Press.Hold && state.phase === RecordPhase.Recording) {
      void send();
    } else if (press === Press.Hold && state.phase === RecordPhase.Starting) {
      cancel();
    }
  };

  // The browser took the touch over (e.g. a system gesture): throw away what was being held, keep a locked one.
  const onPointerCancel = () => {
    const state = live.current;

    state.press = Press.None;
    window.clearTimeout(state.holdTimer);
    state.holdTimer = 0;

    if (state.phase === RecordPhase.Recording || state.phase === RecordPhase.Starting) {
      cancel();
    }
  };

  // Keyboard (Enter or Space): switches voice/video, or sends a locked recording. Holding needs a pointer.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0) {
      return;
    }

    if (live.current.phase === RecordPhase.Locked) {
      void send();
    } else if (live.current.phase === RecordPhase.Idle) {
      toggleMode();
    }
  };

  const cancelNow = useEffectEvent(cancel);

  useEffect(() => {
    if (phase === RecordPhase.Idle) {
      return undefined;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelNow();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  // Leaving the conversation throws the recording away.
  useEffect(() => () => {
    window.clearTimeout(live.current.hintTimer);
    cancelNow();
  }, [convKey]);

  return {
    mode,
    phase,
    recorder,
    slide,
    hint,
    cancel,
    buttonProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClick,
      // A long press must not open the phone's menu.
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
    },
  };
};
